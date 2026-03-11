/**
 * 감정 정의 및 VRM expression 매핑
 *
 * 각 감정은 VRM expression preset 조합 + 전환 속도로 정의된다.
 */

import { VRMExpressionPresetName } from "@pixiv/three-vrm";

/**
 * 감정별 VRM expression 조합
 * expressions: { presetName: 강도(0~1) }
 * transitionSpeed: 전환 속도 (높을수록 빠름)
 * gesture: 감정에 연결된 제스처 (선택)
 */
export const EMOTIONS = {
  neutral: {
    expressions: {},
    transitionSpeed: 2.0,
    gesture: null,
  },

  happy: {
    expressions: {
      [VRMExpressionPresetName.Happy]: 0.7,
    },
    transitionSpeed: 3.0,
    gesture: null,
  },

  sad: {
    expressions: {
      [VRMExpressionPresetName.Sad]: 0.6,
    },
    transitionSpeed: 1.5,
    gesture: null,
  },

  angry: {
    expressions: {
      [VRMExpressionPresetName.Angry]: 0.5,
    },
    transitionSpeed: 4.0,
    gesture: null,
  },

  surprised: {
    expressions: {
      [VRMExpressionPresetName.Surprised]: 0.7,
    },
    transitionSpeed: 5.0,
    gesture: null,
  },

  thinking: {
    expressions: {
      [VRMExpressionPresetName.Neutral]: 0.3,
    },
    transitionSpeed: 2.0,
    gesture: "think",
  },

  greeting: {
    expressions: {
      [VRMExpressionPresetName.Happy]: 0.5,
    },
    transitionSpeed: 3.0,
    gesture: "wave",
  },
};

// 감정에 사용되는 모든 expression preset 목록
export const EMOTION_PRESETS = [
  VRMExpressionPresetName.Happy,
  VRMExpressionPresetName.Sad,
  VRMExpressionPresetName.Angry,
  VRMExpressionPresetName.Surprised,
  VRMExpressionPresetName.Neutral,
  VRMExpressionPresetName.Relaxed,
];
