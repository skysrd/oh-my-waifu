/**
 * VRM 아바타 캐릭터 제어
 * Idle 모션, 감정 표현, 제스처, 리액션, lipsync
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { GESTURES, BONE_MAP, lerp, lerpArray } from "./gestures";
import { EMOTIONS, EMOTION_PRESETS } from "./emotions";

const DEG2RAD = Math.PI / 180;

// rhubarb → VRM viseme 매핑
const VISEME_MAP = {
  aa: VRMExpressionPresetName.Aa,
  ee: VRMExpressionPresetName.Ee,
  ih: VRMExpressionPresetName.Ih,
  oh: VRMExpressionPresetName.Oh,
  ou: VRMExpressionPresetName.Ou,
};

export class AvatarController {
  constructor() {
    this.vrm = null;
    this.mixer = null;
    this.clock = new THREE.Clock();

    // 눈 깜빡임
    this._blinkTimer = 0;
    this._blinkInterval = 3 + Math.random() * 4;
    this._isBlinking = false;

    // Idle 모션
    this._elapsed = 0;
    this._breathPhase = Math.random() * Math.PI * 2;
    this._headSwayPhase = Math.random() * Math.PI * 2;
    this._gazeTarget = new THREE.Vector2(0, 0);
    this._gazeTimer = 0;
    this._gazeInterval = 2 + Math.random() * 3;

    // 감정
    this._currentEmotion = "neutral";
    this._emotionValues = {};
    this._emotionTransition = 0;

    // 제스처
    this._currentGesture = null;
    this._gestureTime = 0;
    this._gestureBlend = 0;
    this._boneRestRotations = {};

    // 리액션 상태
    this._conversationState = "idle"; // idle, listening, thinking, responding, done
    this._stateTimer = 0;
    this._listenNodTimer = 0;
  }

  async load(scene, vrmPath) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    return new Promise((resolve, reject) => {
      loader.load(
        vrmPath,
        (gltf) => {
          this.vrm = gltf.userData.vrm;
          this.vrm.scene.rotation.y = Math.PI;
          scene.add(this.vrm.scene);
          this.mixer = new THREE.AnimationMixer(this.vrm.scene);
          this._captureRestPose();
          console.log("VRM 캐릭터 로드 완료");
          resolve(this.vrm);
        },
        undefined,
        (error) => {
          console.error("VRM 로드 실패:", error);
          reject(error);
        }
      );
    });
  }

  update() {
    const delta = this.clock.getDelta();
    this._elapsed += delta;

    if (this.vrm) {
      this._updateBlink(delta);
      this._updateIdle(delta);
      this._updateEmotion(delta);
      this._updateGesture(delta);
      this._updateReaction(delta);
      this.vrm.update(delta);
    }

    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  // ─── Lipsync ───

  applyLipsync(blendshapes) {
    if (!this.vrm?.expressionManager) return;
    for (const presetName of Object.values(VISEME_MAP)) {
      this.vrm.expressionManager.setValue(presetName, 0);
    }
    for (const [key, value] of Object.entries(blendshapes)) {
      const presetName = VISEME_MAP[key];
      if (presetName) {
        this.vrm.expressionManager.setValue(presetName, value);
      }
    }
  }

  resetLipsync() {
    this.applyLipsync({});
  }

  // ─── 감정 표현 ───

  setEmotion(emotionName) {
    if (emotionName === this._currentEmotion) return;
    if (!EMOTIONS[emotionName]) return;

    this._currentEmotion = emotionName;
    this._emotionTransition = 0;

    const emotionDef = EMOTIONS[emotionName];
    if (emotionDef.gesture) {
      this.playGesture(emotionDef.gesture);
    }
  }

  // ─── 제스처 ───

  playGesture(gestureName) {
    const gesture = GESTURES[gestureName];
    if (!gesture) return;

    this._currentGesture = { name: gestureName, ...gesture };
    this._gestureTime = 0;
    this._gestureBlend = 0;
  }

  stopGesture() {
    this._currentGesture = null;
    this._gestureBlend = 0;
  }

  // ─── 리액션 상태 ───

  setConversationState(state) {
    if (state === this._conversationState) return;
    this._conversationState = state;
    this._stateTimer = 0;
    this._listenNodTimer = 0;

    switch (state) {
      case "listening":
        this.setEmotion("neutral");
        break;
      case "thinking":
        this.setEmotion("thinking");
        break;
      case "responding":
        break;
      case "done":
        this._stateTimer = 0;
        break;
      case "idle":
        this.setEmotion("neutral");
        this.stopGesture();
        break;
    }
  }

  // ─── Private: Idle 모션 ───

  _updateIdle(delta) {
    if (!this.vrm?.humanoid) return;

    // 호흡 모션 (chest + spine 미세 rotation)
    const breathSpeed = 0.8;
    const breathAmount = 1.2;
    const breathValue = Math.sin(this._elapsed * breathSpeed * Math.PI * 2 + this._breathPhase);

    const chest = this._getBone("chest");
    const spine = this._getBone("spine");
    if (chest) {
      const rest = this._getRestRotation("chest");
      chest.rotation.x = rest[0] + breathValue * breathAmount * DEG2RAD;
      chest.rotation.z = rest[2] + breathValue * 0.3 * DEG2RAD;
    }
    if (spine) {
      const rest = this._getRestRotation("spine");
      spine.rotation.x = rest[0] + breathValue * breathAmount * 0.5 * DEG2RAD;
    }

    // 머리 미세 기울기 (제스처가 없을 때만)
    if (!this._currentGesture) {
      const headSwaySpeed = 0.15;
      const headSwayAmount = 2.0;
      const swayX = Math.sin(this._elapsed * headSwaySpeed * Math.PI * 2 + this._headSwayPhase) * headSwayAmount;
      const swayZ = Math.cos(this._elapsed * headSwaySpeed * 0.7 * Math.PI * 2 + this._headSwayPhase) * headSwayAmount * 0.6;

      const head = this._getBone("head");
      if (head) {
        const rest = this._getRestRotation("head");
        head.rotation.x = rest[0] + swayX * 0.3 * DEG2RAD;
        head.rotation.z = rest[2] + swayZ * DEG2RAD;
      }
    }

    // 시선 이동
    this._gazeTimer += delta;
    if (this._gazeTimer >= this._gazeInterval) {
      this._gazeTimer = 0;
      this._gazeInterval = 2 + Math.random() * 4;
      this._gazeTarget.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5,
      );
    }

    const leftEye = this._getBone("leftEye");
    const rightEye = this._getBone("rightEye");
    if (leftEye && rightEye) {
      const gazeSpeed = 3.0;
      const targetX = this._gazeTarget.x * DEG2RAD;
      const targetY = this._gazeTarget.y * DEG2RAD;
      leftEye.rotation.x = lerp(leftEye.rotation.x, targetY, delta * gazeSpeed);
      leftEye.rotation.y = lerp(leftEye.rotation.y, targetX, delta * gazeSpeed);
      rightEye.rotation.x = lerp(rightEye.rotation.x, targetY, delta * gazeSpeed);
      rightEye.rotation.y = lerp(rightEye.rotation.y, targetX, delta * gazeSpeed);
    }
  }

  // ─── Private: 감정 표현 ───

  _updateEmotion(delta) {
    if (!this.vrm?.expressionManager) return;

    const emotionDef = EMOTIONS[this._currentEmotion] || EMOTIONS.neutral;
    const speed = emotionDef.transitionSpeed || 2.0;
    this._emotionTransition = Math.min(1.0, this._emotionTransition + delta * speed);

    for (const preset of EMOTION_PRESETS) {
      const target = emotionDef.expressions[preset] || 0;
      const current = this._emotionValues[preset] || 0;
      const value = lerp(current, target, this._emotionTransition);
      this._emotionValues[preset] = value;
      this.vrm.expressionManager.setValue(preset, value);
    }
  }

  // ─── Private: 제스처 ───

  _updateGesture(delta) {
    if (!this._currentGesture || !this.vrm?.humanoid) return;

    const gesture = this._currentGesture;
    this._gestureTime += delta;

    // 블렌드 인/아웃
    const blendSpeed = 5.0;
    if (this._gestureTime < gesture.duration) {
      this._gestureBlend = Math.min(1.0, this._gestureBlend + delta * blendSpeed);
    }

    // 시간 초과 처리
    if (this._gestureTime >= gesture.duration) {
      if (gesture.loop) {
        this._gestureTime = this._gestureTime % gesture.duration;
      } else {
        this._gestureBlend = Math.max(0, this._gestureBlend - delta * blendSpeed);
        if (this._gestureBlend <= 0) {
          this._currentGesture = null;
          return;
        }
      }
    }

    // 각 bone에 키프레임 보간 적용
    for (const [boneName, keyframes] of Object.entries(gesture.keyframes)) {
      const bone = this._getBone(boneName);
      if (!bone) continue;

      const rotation = this._interpolateKeyframes(keyframes, this._gestureTime);
      const rest = this._getRestRotation(boneName);

      bone.rotation.x = lerp(bone.rotation.x, rest[0] + rotation[0] * DEG2RAD, this._gestureBlend);
      bone.rotation.y = lerp(bone.rotation.y, rest[1] + rotation[1] * DEG2RAD, this._gestureBlend);
      bone.rotation.z = lerp(bone.rotation.z, rest[2] + rotation[2] * DEG2RAD, this._gestureBlend);
    }
  }

  _interpolateKeyframes(keyframes, time) {
    if (keyframes.length === 0) return [0, 0, 0];
    if (time <= keyframes[0].time) return keyframes[0].rotation;
    if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].rotation;

    for (let i = 0; i < keyframes.length - 1; i++) {
      const a = keyframes[i];
      const b = keyframes[i + 1];
      if (time >= a.time && time < b.time) {
        const t = (time - a.time) / (b.time - a.time);
        // 스무스스텝 보간
        const st = t * t * (3 - 2 * t);
        return lerpArray(a.rotation, b.rotation, st);
      }
    }
    return keyframes[keyframes.length - 1].rotation;
  }

  // ─── Private: 리액션 ───

  _updateReaction(delta) {
    this._stateTimer += delta;

    switch (this._conversationState) {
      case "listening":
        // 주기적으로 고개 끄덕임
        this._listenNodTimer += delta;
        if (this._listenNodTimer > 3.0 && !this._currentGesture) {
          this.playGesture("listenNod");
          this._listenNodTimer = 0;
        }
        break;

      case "done":
        // 응답 완료 후 잠시 뒤 idle로 전환
        if (this._stateTimer > 2.0) {
          this.setConversationState("idle");
        }
        break;
    }
  }

  // ─── Private: 눈 깜빡임 ───

  _updateBlink(delta) {
    if (!this.vrm?.expressionManager) return;

    this._blinkTimer += delta;

    if (!this._isBlinking && this._blinkTimer >= this._blinkInterval) {
      this._isBlinking = true;
      this._blinkTimer = 0;
      this._blinkInterval = 3 + Math.random() * 4;
    }

    if (this._isBlinking) {
      const blinkDuration = 0.15;
      const t = this._blinkTimer / blinkDuration;

      if (t < 0.5) {
        this.vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, t * 2);
      } else if (t < 1.0) {
        this.vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, (1 - t) * 2);
      } else {
        this.vrm.expressionManager.setValue(VRMExpressionPresetName.Blink, 0);
        this._isBlinking = false;
        this._blinkTimer = 0;
      }
    }
  }

  // ─── Private: Bone 유틸리티 ───

  _getBone(name) {
    const vrmBoneName = BONE_MAP[name] || name;
    const node = this.vrm?.humanoid?.getNormalizedBoneNode(vrmBoneName);
    return node || null;
  }

  _captureRestPose() {
    if (!this.vrm?.humanoid) return;
    for (const boneName of Object.keys(BONE_MAP)) {
      const bone = this._getBone(boneName);
      if (bone) {
        this._boneRestRotations[boneName] = [
          bone.rotation.x,
          bone.rotation.y,
          bone.rotation.z,
        ];
      }
    }
  }

  _getRestRotation(boneName) {
    return this._boneRestRotations[boneName] || [0, 0, 0];
  }
}
