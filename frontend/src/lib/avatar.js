/**
 * VRM 아바타 캐릭터 제어
 * blendshape 제어, 아이들 애니메이션, lipsync 적용
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";

// rhubarb 포맷 → VRM expression 매핑
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
    this._blinkTimer = 0;
    this._blinkInterval = 3 + Math.random() * 4;
    this._isBlinking = false;
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

    if (this.vrm) {
      this._updateBlink(delta);
      this.vrm.update(delta);
    }

    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  /**
   * Lipsync blendshape 데이터 적용
   * @param {Object} blendshapes - { aa: 0~1, ee: 0~1, oh: 0~1, ou: 0~1 }
   */
  applyLipsync(blendshapes) {
    if (!this.vrm?.expressionManager) return;

    // 모든 viseme 초기화
    for (const presetName of Object.values(VISEME_MAP)) {
      this.vrm.expressionManager.setValue(presetName, 0);
    }

    // blendshape 적용
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

  setExpression(name, value) {
    if (!this.vrm?.expressionManager) return;
    this.vrm.expressionManager.setValue(name, value);
  }

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
}
