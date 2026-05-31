import { useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import type { TagSuggestion } from '@/types';

const YAMNET_MODEL_URL = 'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1';

const LABEL_MAP: Record<string, string> = {
  'Dog': '狗叫',
  'Bark': '狗叫',
  'Howl': '狗叫',
  'Vehicle horn, car horn, honking': '汽车鸣笛',
  'Car horn': '汽车鸣笛',
  'Vehicle horn': '汽车鸣笛',
  'Rain': '雨声',
  'Raindrop': '雨声',
  'Bird': '鸟鸣',
  'Bird vocalization, bird call, bird song': '鸟鸣',
  'Chirp, tweet': '鸟鸣',
  'Speech': '人声',
  'Human voice': '人声',
  'Conversation': '人声',
  'Music': '背景音乐',
  'Musical instrument': '背景音乐',
  'Background music': '背景音乐',
  'Pop music': '背景音乐',
  'Rock music': '背景音乐',
  'Footstep': '脚步声',
  'Walking, footsteps': '脚步声',
  'Knock': '敲门声',
  'Tap': '敲门声',
  'Siren': '警报声',
  'Alarm': '警报声',
  'Emergency vehicle': '警报声',
  'Laughter': '笑声',
  'Giggle': '笑声',
};

export function useYamnet() {
  const modelRef = useRef<tf.GraphModel | null>(null);
  const classNamesRef = useRef<string[]>([]);
  const loadingRef = useRef(false);

  const loadModel = useCallback(async () => {
    if (modelRef.current || loadingRef.current) return;
    loadingRef.current = true;

    try {
      console.log('Loading YAMNet model...');
      const model = await tf.loadGraphModel(YAMNET_MODEL_URL, { fromTFHub: true });
      modelRef.current = model;

      const classNames = (model as any).metadata?.classNames || [];
      classNamesRef.current = classNames;
      console.log(`YAMNet loaded with ${classNames.length} classes`);
    } catch (error) {
      console.error('Failed to load YAMNet:', error);
      throw error;
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const analyzeAudio = useCallback(async (
    audioBuffer: AudioBuffer,
    startTime: number,
    endTime: number
  ): Promise<TagSuggestion[]> => {
    if (!modelRef.current) {
      await loadModel();
    }

    if (!modelRef.current) {
      throw new Error('Failed to load YAMNet model');
    }

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);

    const channelData = audioBuffer.getChannelData(0);
    const segment = channelData.slice(startSample, endSample);

    const targetLength = 15600;
    let resampled: Float32Array;
    if (segment.length < targetLength) {
      resampled = new Float32Array(targetLength);
      resampled.set(segment);
    } else {
      resampled = segment.slice(0, targetLength);
    }

    let values: Float32Array;
    tf.tidy(() => {
      const waveform = tf.tensor1d(resampled, 'float32');
      const scores = modelRef.current!.predict(waveform) as tf.Tensor;
      const meanScores = scores.mean(0);
      values = meanScores.dataSync() as Float32Array;
      return meanScores;
    });

    const classNames = classNamesRef.current;
    const suggestions: TagSuggestion[] = [];
    const seenLabels = new Set<string>();

    for (let i = 0; i < values.length; i++) {
      const confidence = values[i];
      if (confidence > 0.05) {
        const yamnetClass = classNames[i] || `Class ${i}`;
        const mappedLabel = LABEL_MAP[yamnetClass] || yamnetClass;

        if (!seenLabels.has(mappedLabel)) {
          seenLabels.add(mappedLabel);
          suggestions.push({
            label: mappedLabel,
            confidence: confidence,
            yamnetClass,
          });
        }
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 8);
  }, [loadModel]);

  return {
    loadModel,
    analyzeAudio,
    isLoaded: () => modelRef.current !== null,
  };
}
