import { useRef, useCallback, useEffect } from "react";

/**
 * Lipsync 동기화 훅
 * TTS 오디오 재생 타이밍에 맞춰 blendshape 데이터를 업데이트한다.
 */
export function useLipsync(avatarController) {
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);

  const applyLipsync = useCallback(
    (lipsyncData, duration) => {
      if (!avatarController?.current || !lipsyncData?.length) return;

      startTimeRef.current = performance.now() / 1000;
      let dataIndex = 0;

      const animate = () => {
        const elapsed = performance.now() / 1000 - startTimeRef.current;

        if (elapsed >= duration) {
          avatarController.current.resetLipsync();
          return;
        }

        // 현재 시간에 맞는 lipsync 프레임 찾기
        while (
          dataIndex < lipsyncData.length - 1 &&
          lipsyncData[dataIndex + 1].time <= elapsed
        ) {
          dataIndex++;
        }

        const current = lipsyncData[dataIndex];
        const next = lipsyncData[dataIndex + 1];

        if (next) {
          // 두 프레임 사이 보간
          const t = (elapsed - current.time) / (next.time - current.time);
          const clampedT = Math.max(0, Math.min(1, t));
          const blended = {};

          const allKeys = new Set([
            ...Object.keys(current.blendshapes || {}),
            ...Object.keys(next.blendshapes || {}),
          ]);

          for (const key of allKeys) {
            const a = current.blendshapes?.[key] || 0;
            const b = next.blendshapes?.[key] || 0;
            blended[key] = a + (b - a) * clampedT;
          }

          avatarController.current.applyLipsync(blended);
        } else if (current) {
          avatarController.current.applyLipsync(current.blendshapes || {});
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [avatarController]
  );

  const stopLipsync = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    avatarController?.current?.resetLipsync();
  }, [avatarController]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return { applyLipsync, stopLipsync };
}
