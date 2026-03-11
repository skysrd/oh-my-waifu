/**
 * 제스처 키프레임 정의
 *
 * 각 제스처는 bone별 keyframe 시퀀스로 정의된다.
 * time: 초 단위, rotation: [x, y, z] 오일러 각도(도)
 */

// 보간 유틸리티
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpArray(a, b, t) {
  return a.map((v, i) => lerp(v, b[i], t));
}

/**
 * 제스처 정의
 * duration: 전체 시간(초)
 * loop: 반복 여부
 * keyframes: { boneName: [{ time, rotation, position? }] }
 */
export const GESTURES = {
  nod: {
    duration: 1.2,
    loop: false,
    keyframes: {
      head: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.2, rotation: [12, 0, 0] },
        { time: 0.4, rotation: [-2, 0, 0] },
        { time: 0.6, rotation: [10, 0, 0] },
        { time: 0.8, rotation: [-1, 0, 0] },
        { time: 1.2, rotation: [0, 0, 0] },
      ],
    },
  },

  think: {
    duration: 2.5,
    loop: false,
    keyframes: {
      head: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.5, rotation: [8, 12, 5] },
        { time: 2.0, rotation: [8, 12, 5] },
        { time: 2.5, rotation: [0, 0, 0] },
      ],
      neck: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.5, rotation: [3, 5, 0] },
        { time: 2.0, rotation: [3, 5, 0] },
        { time: 2.5, rotation: [0, 0, 0] },
      ],
    },
  },

  wave: {
    duration: 2.0,
    loop: false,
    keyframes: {
      rightUpperArm: [
        { time: 0.0, rotation: [0, 0, -70] },
        { time: 0.3, rotation: [-30, 0, -140] },
        { time: 0.5, rotation: [-30, 0, -140] },
        { time: 2.0, rotation: [0, 0, -70] },
      ],
      rightLowerArm: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.3, rotation: [0, 0, -30] },
        { time: 0.6, rotation: [0, 0, -10] },
        { time: 0.9, rotation: [0, 0, -30] },
        { time: 1.2, rotation: [0, 0, -10] },
        { time: 1.5, rotation: [0, 0, -30] },
        { time: 2.0, rotation: [0, 0, 0] },
      ],
    },
  },

  bow: {
    duration: 2.0,
    loop: false,
    keyframes: {
      spine: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.5, rotation: [20, 0, 0] },
        { time: 1.2, rotation: [20, 0, 0] },
        { time: 2.0, rotation: [0, 0, 0] },
      ],
      head: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.5, rotation: [10, 0, 0] },
        { time: 1.2, rotation: [10, 0, 0] },
        { time: 2.0, rotation: [0, 0, 0] },
      ],
    },
  },

  shrug: {
    duration: 1.5,
    loop: false,
    keyframes: {
      leftUpperArm: [
        { time: 0.0, rotation: [0, 0, 60] },
        { time: 0.3, rotation: [-10, 0, 50] },
        { time: 0.8, rotation: [-10, 0, 50] },
        { time: 1.5, rotation: [0, 0, 60] },
      ],
      rightUpperArm: [
        { time: 0.0, rotation: [0, 0, -60] },
        { time: 0.3, rotation: [-10, 0, -50] },
        { time: 0.8, rotation: [-10, 0, -50] },
        { time: 1.5, rotation: [0, 0, -60] },
      ],
      head: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.3, rotation: [0, 0, 8] },
        { time: 0.8, rotation: [0, 0, 8] },
        { time: 1.5, rotation: [0, 0, 0] },
      ],
    },
  },

  listenNod: {
    duration: 1.8,
    loop: true,
    keyframes: {
      head: [
        { time: 0.0, rotation: [0, 0, 0] },
        { time: 0.4, rotation: [6, 0, 0] },
        { time: 0.8, rotation: [0, 0, 0] },
        { time: 1.2, rotation: [5, 2, 0] },
        { time: 1.8, rotation: [0, 0, 0] },
      ],
    },
  },
};

// VRM humanoid bone name → three-vrm bone name 매핑
export const BONE_MAP = {
  hips: "hips",
  spine: "spine",
  chest: "chest",
  upperChest: "upperChest",
  neck: "neck",
  head: "head",
  leftUpperArm: "leftUpperArm",
  leftLowerArm: "leftLowerArm",
  leftHand: "leftHand",
  rightUpperArm: "rightUpperArm",
  rightLowerArm: "rightLowerArm",
  rightHand: "rightHand",
  leftEye: "leftEye",
  rightEye: "rightEye",
};
