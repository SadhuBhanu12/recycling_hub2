import { Router } from 'express';
import { supabase, SmartBin, BinType } from '../lib/supabase';
import { Request, Response } from 'express';

interface WasteClassification {
  type: string;
  confidence: number;
  points_earned: number;
  bin_id?: string;
}

const router = Router();

// Get all smart bins
router.get('/bins', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('smart_bins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bin fill level
router.post('/bins/:binId/update-level', async (req, res) => {
  const { binId } = req.params;
  const { fillLevel, sensorData } = req.body;

  try {
    // Update bin data
    const { data, error } = await supabase
      .from('smart_bins')
      .update({
        current_fill_level: fillLevel,
        sensor_data: sensorData,
        updated_at: new Date()
      })
      .eq('bin_id', binId)
      .single();

    if (error) throw error;

    // Check if collection is needed
    if (fillLevel >= 80) {
      await scheduleCollection(binId);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record waste disposal
router.post('/bins/:binId/record-disposal', async (req, res) => {
  const { binId } = req.params;
  const { userId, wasteType, weight } = req.body;

  try {
    // Record the waste classification
    const { data: classification, error: classError }: { data: WasteClassification | null, error: any } = await supabase
      .from('waste_classifications')
      .insert({
        user_id: userId,
        classification: wasteType,
        points_earned: calculatePoints(wasteType, weight),
        details: { weight, source: 'smart_bin', bin_id: binId }
      })
      .single();

    if (classError) throw classError;

    // Update user points
    const { error: pointsError } = await supabase
      .from('user_profiles')
      .update({
        points: classification?.points_earned || 0,
        waste_classified: supabase
          .from('user_profiles')
          .select('waste_classified')
          .eq('id', userId)
          .single()
          .then(({ data }) => (data?.waste_classified || 0) + 1)
      })
      .eq('id', userId);

    if (pointsError) throw pointsError;

    res.json({
      message: 'Waste disposal recorded successfully',
      pointsEarned: classification?.points_earned || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule bin collection
async function scheduleCollection(binId) {
  try {
    const { data: bin } = await supabase
      .from('smart_bins')
      .select('*')
      .eq('bin_id', binId)
      .single();

    if (!bin) throw new Error('Bin not found');

    // Schedule collection for bins at 80% or higher
    if (bin.current_fill_level >= 80) {
      const nextCollection = new Date();
      nextCollection.setHours(nextCollection.getHours() + 24); // Schedule within 24 hours

      await supabase
        .from('smart_bins')
        .update({
          next_collection: nextCollection,
          status: 'pending_collection'
        })
        .eq('bin_id', binId);
    }
  } catch (error) {
    console.error('Error scheduling collection:', error);
  }
}

// Calculate points based on waste type and weight
function calculatePoints(wasteType, weight) {
  const pointsPerKg = {
    biodegradable: 5,
    recyclable: 10,
    hazardous: 15
  };

  return Math.round(weight * (pointsPerKg[wasteType] || 5));
}

export default router;