import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, Sparkles, Trophy, CheckCircle,
  Eye, PenTool, ArrowRight, RotateCcw, LayoutGrid
} from 'lucide-react';
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
    // If previously learning a scene, can load or default to 'catalog'
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

  // Re-load progress when scene changes
  useEffect(() => {
    setProgress(getVisualProgress(scene.sceneId));
    setActiveZoneIndex(0);
    setSelectedItem(null);
  }, [scene.sceneId]);

  // Current active mode in Scene: 'level1' | 'level2'
  const [mode, setMode] = useState('level1');

  // Active Zone index (0 to 3)
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);

  // Selected item in Level 1 for card view
  const [selectedItem, setSelectedItem] = useState(null);

  // Completed items in current session
  const [completedItemIds, setCompletedItemIds] = useState(() => {
    return new Set(Object.keys(progress.completedHotspots || {}));
  });

  // Keep completedItemIds in sync when scene/progress changes
  useEffect(() => {
    setCompletedItemIds(new Set(Object.keys(progress.completedHotspots || {})));
  }, [progress.completedHotspots]);

  // Completed zones set
  const completedZoneIds = useMemo(() => {
    const set = new Set();
    Object.entries(progress.completedZones || {}).forEach(([zid, status]) => {
      if (mode === 'level1' ? status.level1 : status.level2) {
        set.add(zid);
      }
    });
    return set;
  }, [progress.completedZones, mode]);

  // Unlocked zones set
  const unlockedZoneIds = useMemo(() => {
    const defaultZone = scene.zones[0]?.zoneId || 'zone_1';
    return new Set(progress.unlockedZoneIds || [defaultZone]);
  }, [progress.unlockedZoneIds, scene.zones]);

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
    setActiveZoneIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Catalog View
  const handleBackToCatalog = () => {
    setViewMode('catalog');
    setSelectedItem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When Level 1 item is marked recognized
  const handleItemRecognized = useCallback((item) => {
    setCompletedItemIds(prev => {
      const next = new Set(prev).add(item.id);

      // Check if all items in current zone are now completed
      const allInZoneDone = activeZone.items.every(it => next.has(it.id));

      if (allInZoneDone) {
        // Mark zone completed for Level 1
        const nextCompletedZones = {
          ...(progress.completedZones || {}),
          [activeZone.zoneId]: {
            ...(progress.completedZones?.[activeZone.zoneId] || {}),
            level1: true,
          },
        };

        // Unlock next zone
        const nextIndex = activeZoneIndex + 1;
        const defaultZone = scene.zones[0]?.zoneId || 'zone_1';
        const nextUnlocked = new Set(progress.unlockedZoneIds || [defaultZone]);
        if (nextIndex < scene.zones.length) {
          nextUnlocked.add(scene.zones[nextIndex].zoneId);
        }

        const updatedProgress = {
          ...progress,
          unlockedZoneIds: Array.from(nextUnlocked),
          completedZones: nextCompletedZones,
          completedHotspots: {
            ...(progress.completedHotspots || {}),
            ...Object.fromEntries(Array.from(next).map(id => [id, true])),
          },
        };

        setProgress(updatedProgress);
        saveVisualProgress(scene.sceneId, updatedProgress);

        // Advance to next zone if available
        if (nextIndex < scene.zones.length) {
          setTimeout(() => {
            setActiveZoneIndex(nextIndex);
            setSelectedItem(null);
          }, 450);
        }
      } else {
        // Save individual hotspot
        const updatedProgress = {
          ...progress,
          completedHotspots: {
            ...(progress.completedHotspots || {}),
            [item.id]: true,
          },
        };
        setProgress(updatedProgress);
        saveVisualProgress(scene.sceneId, updatedProgress);
      }

      return next;
    });

    // Advance to next uncompleted item in zone
    const remaining = activeZone.items.filter(it => it.id !== item.id && !completedItemIds.has(it.id));
    if (remaining.length > 0) {
      setSelectedItem(remaining[0]);
    } else {
      setSelectedItem(null);
    }
  }, [activeZone, activeZoneIndex, completedItemIds, progress, scene.sceneId, scene.zones]);

  // When Level 2 completes a zone
  const handleLevel2ZoneComplete = useCallback((zoneId) => {
    const nextCompletedZones = {
      ...(progress.completedZones || {}),
      [zoneId]: {
        ...(progress.completedZones?.[zoneId] || {}),
        level2: true,
      },
    };

    const nextIndex = activeZoneIndex + 1;
    const defaultZone = scene.zones[0]?.zoneId || 'zone_1';
    const nextUnlocked = new Set(progress.unlockedZoneIds || [defaultZone]);
    if (nextIndex < scene.zones.length) {
      nextUnlocked.add(scene.zones[nextIndex].zoneId);
    }

    const updatedProgress = {
      ...progress,
      unlockedZoneIds: Array.from(nextUnlocked),
      completedZones: nextCompletedZones,
    };

    setProgress(updatedProgress);
    saveVisualProgress(scene.sceneId, updatedProgress);

    // If more zones, advance
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

        {/* Level Switcher (Level 1 vs Level 2) */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('level1'); setSelectedItem(null); }}
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
            onClick={() => { setMode('level2'); setSelectedItem(null); }}
            className={`btn btn-xs ${mode === 'level2' ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              color: mode === 'level2' ? '#ffffff' : '#94a3b8',
            }}
          >
            <PenTool size={12} className="inline mr-1" /> Cấp độ 2
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
          onCancel={() => setMode('level1')}
        />
      )}
    </div>
  );
}
