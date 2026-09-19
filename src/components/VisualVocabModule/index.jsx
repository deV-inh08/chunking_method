import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Eye, PenTool, Lock } from 'lucide-react';
import { SceneViewer } from './SceneViewer';
import { Level1RecognitionCard } from './Level1RecognitionCard';
import { Level2RecallSession } from './Level2RecallSession';
import { TopicGridCatalog } from './TopicGridCatalog';
import { getVisualProgress, saveVisualProgress } from '../../store/storage';
import { ALL_SCENES } from '../../data/scenes';

/**
 * VisualVocabModule
 * Orchestrator for Visual Vocabulary Mode.
 * Dual-Screen Workflow:
 * 1. Catalog View (Lưới 10 chủ đề chuẩn theo ảnh mẫu)
 * 2. Scene View (Khám phá 20 từ/tranh với 4 khu vực & 2 cấp độ)
 */
export function VisualVocabModule({ onToast, onStartPractice, onNavigate }) {
  // Current view: 'catalog' | 'scene'
  const [viewMode, setViewMode] = useState(() => {
    return 'catalog';
  });

  // Current active scene ID
  const [activeSceneId, setActiveSceneId] = useState(() => {
    return localStorage.getItem('speaking_chunk_active_visual_scene') || 'job_interview';
  });

  const sceneEntry = useMemo(() => {
    const found = ALL_SCENES.find(s => s.sceneId === activeSceneId);
    return found || ALL_SCENES[0];
  }, [activeSceneId]);

  const scene = sceneEntry.data;

  // Visual Scene Progress from LocalStorage
  const [progress, setProgress] = useState(() => {
    return getVisualProgress(scene.sceneId);
  });

  // Current active mode in Scene: 'level1' | 'level2'
  const [mode, setMode] = useState('level1');

  // Active Zone index (0 to 3)
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);

  // Selected item in Level 1 for card view
  const [selectedItem, setSelectedItem] = useState(null);

  // Bug 2: Derive completedItemIds directly from progress (no redundant state)
  const completedItemIds = useMemo(() => {
    const map = progress.completedHotspots?.[mode] || {};
    return new Set(Object.keys(map));
  }, [progress.completedHotspots, mode]);

  // Bug 1: Check if all Level 1 items in the current scene are fully completed
  const level1FullyDone = useMemo(() => {
    if (!scene?.zones) return false;
    const allItemIds = scene.zones.flatMap(z => (z.items || []).map(i => i.id));
    const level1Completed = progress.completedHotspots?.level1 || {};
    return allItemIds.length > 0 && allItemIds.every(id => level1Completed[id]);
  }, [scene, progress.completedHotspots]);

  // Auto-fallback to level1 if currently in level2 but level1 is not fully completed
  useEffect(() => {
    if (mode === 'level2' && !level1FullyDone) {
      setMode('level1');
    }
  }, [mode, level1FullyDone]);

  // Bug 5: Auto-resume to first unfinished zone in current mode when scene or mode changes
  useEffect(() => {
    const currentProgress = getVisualProgress(scene.sceneId);
    setProgress(currentProgress);
    setSelectedItem(null);

    const completedMap = currentProgress.completedZones || {};
    const firstUnfinished = scene.zones.findIndex(
      z => !completedMap[z.zoneId]?.[mode]
    );
    setActiveZoneIndex(firstUnfinished !== -1 ? firstUnfinished : 0);
  }, [scene.sceneId, mode, scene.zones]);

  // Completed zones set for current mode
  const completedZoneIds = useMemo(() => {
    const set = new Set();
    Object.entries(progress.completedZones || {}).forEach(([zid, status]) => {
      if (mode === 'level1' ? status.level1 : status.level2) {
        set.add(zid);
      }
    });
    return set;
  }, [progress.completedZones, mode]);

  // Bug 2: Unlocked zones set segregated by mode
  const unlockedZoneIds = useMemo(() => {
    const defaultZone = scene.zones[0]?.zoneId || 'zone_1';
    const raw = progress.unlockedZoneIds?.[mode];
    if (Array.isArray(raw) && raw.length > 0) return new Set(raw);
    if (Array.isArray(progress.unlockedZoneIds)) {
      return mode === 'level1' ? new Set(progress.unlockedZoneIds) : new Set([defaultZone]);
    }
    return new Set([defaultZone]);
  }, [progress.unlockedZoneIds, mode, scene.zones]);

  const activeZone = scene.zones[activeZoneIndex] || scene.zones[0];

  // Total items and completed count in scene
  const totalItemsInScene = useMemo(() => {
    return scene.zones.reduce((acc, z) => acc + (z.items?.length || 0), 0);
  }, [scene.zones]);

  const totalCompletedInScene = useMemo(() => {
    let count = 0;
    (scene.zones || []).forEach(z => {
      (z.items || []).forEach(it => {
        if (completedItemIds.has(it.id)) count++;
      });
    });
    return count;
  }, [scene.zones, completedItemIds]);

  // Switch Scene & Enter Scene View
  const handleSelectScene = (sceneId) => {
    setActiveSceneId(sceneId);
    localStorage.setItem('speaking_chunk_active_visual_scene', sceneId);
    setViewMode('scene');
    setSelectedItem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Catalog View
  const handleBackToCatalog = () => {
    setViewMode('catalog');
    setSelectedItem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mode Switch with resume logic
  const handleModeSwitch = (newMode) => {
    if (newMode === 'level2' && !level1FullyDone) return;
    setMode(newMode);
    setSelectedItem(null);
    const completedMap = progress.completedZones || {};
    const firstUnfinished = scene.zones.findIndex(
      z => !completedMap[z.zoneId]?.[newMode]
    );
    setActiveZoneIndex(firstUnfinished !== -1 ? firstUnfinished : 0);
  };

  // Bug 3 & 4: Pure Level 1 item recognition handler (no side-effects inside state updater)
  const handleItemRecognized = useCallback((item) => {
    const currentMode = 'level1';
    const prevCompletedMap = progress.completedHotspots?.[currentMode] || {};
    const nextCompletedMap = { ...prevCompletedMap, [item.id]: true };
    const nextCompletedSet = new Set(Object.keys(nextCompletedMap));

    // Check if all items in current zone are now completed
    const allInZoneDone = activeZone.items.every(it => nextCompletedSet.has(it.id));

    const nextCompletedZones = {
      ...(progress.completedZones || {}),
      [activeZone.zoneId]: {
        ...(progress.completedZones?.[activeZone.zoneId] || {}),
        [currentMode]: allInZoneDone ? true : (progress.completedZones?.[activeZone.zoneId]?.[currentMode] || false),
      },
    };

    // Unlock next zone
    const nextIndex = activeZoneIndex + 1;
    const defaultZone = scene.zones[0]?.zoneId || 'zone_1';
    const currentUnlocked = progress.unlockedZoneIds?.[currentMode] || [defaultZone];
    const nextUnlocked = new Set(currentUnlocked);
    if (allInZoneDone && nextIndex < scene.zones.length) {
      nextUnlocked.add(scene.zones[nextIndex].zoneId);
    }

    const updatedProgress = {
      ...progress,
      unlockedZoneIds: {
        ...(progress.unlockedZoneIds || {}),
        [currentMode]: Array.from(nextUnlocked),
      },
      completedZones: nextCompletedZones,
      completedHotspots: {
        ...(progress.completedHotspots || {}),
        [currentMode]: nextCompletedMap,
      },
    };

    // Update state and persistent storage cleanly outside updater
    setProgress(updatedProgress);
    saveVisualProgress(scene.sceneId, updatedProgress);

    // Advance to next uncompleted item or next zone
    if (allInZoneDone) {
      if (nextIndex < scene.zones.length) {
        setTimeout(() => {
          setActiveZoneIndex(nextIndex);
          setSelectedItem(null);
        }, 450);
      } else {
        setSelectedItem(null);
      }
    } else {
      const remaining = activeZone.items.filter(it => it.id !== item.id && !nextCompletedSet.has(it.id));
      setSelectedItem(remaining.length > 0 ? remaining[0] : null);
    }
  }, [activeZone, activeZoneIndex, progress, scene.sceneId, scene.zones]);

  // Bug 3 & 4: Pure Level 2 complete zone handler
  const handleLevel2ZoneComplete = useCallback((zoneId) => {
    const currentMode = 'level2';
    const nextCompletedZones = {
      ...(progress.completedZones || {}),
      [zoneId]: {
        ...(progress.completedZones?.[zoneId] || {}),
        [currentMode]: true,
      },
    };

    const nextIndex = activeZoneIndex + 1;
    const defaultZone = scene.zones[0]?.zoneId || 'zone_1';
    const currentUnlocked = progress.unlockedZoneIds?.[currentMode] || [defaultZone];
    const nextUnlocked = new Set(currentUnlocked);
    if (nextIndex < scene.zones.length) {
      nextUnlocked.add(scene.zones[nextIndex].zoneId);
    }

    // Collect all vocabIds of the completed zone into completedHotspots.level2
    const zoneObj = scene.zones.find(z => z.zoneId === zoneId);
    const zoneItemIds = (zoneObj?.items || []).map(i => i.id);
    const nextLevel2Hotspots = {
      ...(progress.completedHotspots?.level2 || {}),
      ...Object.fromEntries(zoneItemIds.map(id => [id, true])),
    };

    const updatedProgress = {
      ...progress,
      unlockedZoneIds: {
        ...(progress.unlockedZoneIds || {}),
        [currentMode]: Array.from(nextUnlocked),
      },
      completedZones: nextCompletedZones,
      completedHotspots: {
        ...(progress.completedHotspots || {}),
        [currentMode]: nextLevel2Hotspots,
      },
    };

    setProgress(updatedProgress);
    saveVisualProgress(scene.sceneId, updatedProgress);

    // Advance to next zone if available
    if (nextIndex < scene.zones.length) {
      setTimeout(() => {
        setActiveZoneIndex(nextIndex);
      }, 1000);
    }
  }, [activeZoneIndex, progress, scene.sceneId, scene.zones]);

  // =========================================================================
  // VIEW 1: TOPIC GRID CATALOG (Matches media_1789576618473.png)
  // =========================================================================
  if (viewMode === 'catalog') {
    return <TopicGridCatalog onSelectScene={handleSelectScene} />;
  }

  // =========================================================================
  // VIEW 2: SCENE VIEWER (Matches media_1789577500483.jpg & media_1789575802825)
  // =========================================================================
  return (
    <div className="visual-vocab-module-container pb-12 animate-fade-in w-full max-w-2xl sm:max-w-3xl mx-auto px-2">
      {/* 1. TOP NAV BAR: Back to Catalog + Scene Switcher + Level Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Back to Catalog Button */}
          <button
            type="button"
            onClick={handleBackToCatalog}
            className="btn btn-ghost btn-xs text-slate-300 hover:text-white"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 8,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
            }}
            title="Quay lại danh mục 10 chủ đề"
          >
            <ChevronLeft size={15} />
            <span className="text-xs font-semibold">Danh sách chủ đề</span>
          </button>

          {/* Quick Scene Selector Dropdown */}
          <select
            value={activeSceneId}
            onChange={(e) => handleSelectScene(e.target.value)}
            className="select select-xs bg-slate-900 border-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
            style={{ padding: '4px 8px', height: 28 }}
          >
            {ALL_SCENES.map((s) => (
              <option key={s.sceneId} value={s.sceneId}>
                {s.dayTitle}
              </option>
            ))}
          </select>
        </div>

        {/* Level Switcher (Bug 1: Level 2 Locked until Level 1 fully done) */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            onClick={() => handleModeSwitch('level1')}
            className={`btn btn-xs ${mode === 'level1' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              color: mode === 'level1' ? '#ffffff' : '#94a3b8',
            }}
          >
            <Eye size={12} className="inline mr-1" /> Cấp độ 1
          </button>
          <button
            type="button"
            disabled={!level1FullyDone}
            onClick={() => handleModeSwitch('level2')}
            className={`btn btn-xs ${mode === 'level2' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              color: mode === 'level2' ? '#ffffff' : '#94a3b8',
              opacity: level1FullyDone ? 1 : 0.4,
              cursor: level1FullyDone ? 'pointer' : 'not-allowed',
            }}
            title={
              level1FullyDone
                ? 'Chuyển sang Cấp độ 2: Gợi nhớ chủ động (SRS)'
                : 'Hoàn thành tất cả từ ở Cấp độ 1 để mở khoá Cấp độ 2'
            }
          >
            {level1FullyDone ? (
              <PenTool size={12} className="inline mr-1" />
            ) : (
              <Lock size={12} className="inline mr-1" />
            )}
            Cấp độ 2
          </button>
        </div>
      </div>

      {/* 2. HEADER BANNER (Title, Subtitle, 20-word counter badge) */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight m-0">
            {sceneEntry.dayTitle} — Cấp độ {mode === 'level1' ? '1' : '2'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'level1' ? 'Nhận diện có nhãn' : 'Gợi nhớ chủ động (SRS)'} · Vùng đang mở: <span className="text-slate-200 font-semibold">{activeZone?.label}</span>
          </p>
        </div>

        {/* Counter Badge (e.g. 0/20 từ) */}
        <div
          className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: 'rgba(20, 184, 166, 0.15)',
            border: '1px solid rgba(20, 184, 166, 0.35)',
            color: '#2dd4bf',
          }}
        >
          {totalCompletedInScene}/{totalItemsInScene} từ
        </div>
      </div>

      {/* 3. SEGMENTED ZONE PROGRESS BAR (Exact match to Spec & Mockup) */}
      <div className="mb-3">
        <div className="grid grid-cols-4 gap-2 mb-1.5 w-full">
          {scene.zones.map((zone, idx) => {
            const isDone = completedZoneIds.has(zone.zoneId);
            const isCurrent = idx === activeZoneIndex;
            const isUnlocked = unlockedZoneIds.has(zone.zoneId);

            return (
              <button
                key={zone.zoneId}
                type="button"
                disabled={!isUnlocked}
                onClick={() => { setActiveZoneIndex(idx); setSelectedItem(null); }}
                className="h-1.5 rounded-full transition-all duration-300 w-full border-none p-0"
                style={{
                  background: isDone
                    ? '#14b8a6'
                    : isCurrent
                    ? '#38bdf8'
                    : 'rgba(255, 255, 255, 0.12)',
                  cursor: isUnlocked ? 'pointer' : 'default',
                  opacity: isUnlocked ? 1 : 0.4,
                }}
                title={`Khu ${idx + 1}: ${zone.label} ${isDone ? '(Đã xong)' : isUnlocked ? '(Đang mở)' : '(Đang khóa)'}`}
              />
            );
          })}
        </div>
        <div className="text-center text-[11px] font-medium text-slate-400">
          Cấp độ {mode === 'level1' ? '1' : '2'} — Vùng đang mở: <span className="text-slate-200 font-semibold">{activeZone?.label}</span>
        </div>
      </div>

      {/* 4. COMPACT SCENE VIEWER (Contained 16:9 photo frame with 20 hotspots) */}
      <div className="w-full relative mb-3">
        <SceneViewer
          scene={scene}
          activeZone={activeZone}
          activeZoneIndex={activeZoneIndex}
          selectedItem={selectedItem}
          completedItemIds={completedItemIds}
          completedZoneIds={completedZoneIds}
          unlockedZoneIds={unlockedZoneIds}
          mode={mode}
          onSelectItem={(item) => setSelectedItem(item)}
        />
      </div>

      {/* 5. BOTTOM GUIDANCE / RECOGNITION / RECALL PANEL */}
      {mode === 'level1' ? (
        selectedItem ? (
          <Level1RecognitionCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onRecognized={handleItemRecognized}
            isLastInZone={activeZone.items.every(it => it.id === selectedItem.id || completedItemIds.has(it.id))}
          />
        ) : (
          /* Spec-exact instruction card */
          <div
            className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 p-4 text-center text-xs sm:text-sm text-slate-300 animate-fade-in"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            Chạm vào các chấm sáng để bắt đầu. Chấm <strong style={{ color: '#fbbf24' }}>vàng</strong> là vật thể, chấm <strong style={{ color: '#c084fc' }}>tím</strong> là hành động/cụm động từ.
          </div>
        )
      ) : (
        /* Level 2 Recall Session */
        <Level2RecallSession
          zone={activeZone}
          topic={scene.topic || 'Business & Work'}
          onCompleteZone={handleLevel2ZoneComplete}
          onCancel={() => handleModeSwitch('level1')}
        />
      )}
    </div>
  );
}
