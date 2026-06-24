import { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LanguageContext.jsx';
import StagePopup from './StagePopup.jsx';

const STAGES = ['brief', 'forhandling', 'design', 'produktion', 'leverans', 'faktura', 'betald'];

export function getStatusColor(status) {
  switch (status) {
    case 'active': return '#6B7FD4';
    case 'under_forhandling': return '#6B7FD4';
    case 'hamtas_av_kund': return '#6B7FD4';
    case 'frakt': return '#6B7FD4';
    case 'skickad': return '#6B7FD4';
    case 'done': return '#4CAF88';
    case 'pris_godkant': return '#4CAF88';
    case 'behover_atgard': return '#E8A838';
    case 'declined': return '#D96B6B';
    default: return 'var(--pipeline-not-started)';
  }
}

export function getStatusBorder(status) {
  if (status === 'not_started' || !status) return 'var(--pipeline-not-started-border)';
  return getStatusColor(status);
}


export default function PipelineDots({ order, readOnly = false, overdue = false }) {
  const { t } = useLang();
  const [popup, setPopup] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!popup) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popup]);

  const handleDotClick = (e, stage) => {
    e.stopPropagation();
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopup({ stage, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  };

  // Overdue indicator: paint any active-ish stage dot red — system-driven.
  const OVERDUE_RED = '#D96B6B';
  const ACTIVE_STATUSES = new Set([
    'active', 'under_forhandling', 'hamtas_av_kund', 'frakt', 'skickad', 'behover_atgard',
  ]);

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative' }}>
      {STAGES.map((stage, i) => {
        const stageData = order.pipeline[stage];
        const status = stageData?.status || 'not_started';
        const baseColor = getStatusColor(status);
        const baseBorder = getStatusBorder(status);
        const forceRed = overdue && ACTIVE_STATUSES.has(status);
        const color = forceRed ? OVERDUE_RED : baseColor;
        const border = forceRed ? OVERDUE_RED : baseBorder;
        const isLast = i === STAGES.length - 1;

        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
            {/* Dot + label */}
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, width: 38,
                cursor: readOnly ? 'default' : 'pointer',
              }}
              onClick={(e) => handleDotClick(e, stage)}
              title={!readOnly ? t(`stage_${stage}`) : undefined}
            >
              <div style={{
                width: 13, height: 13,
                borderRadius: '50%',
                background: color,
                border: `1.5px solid ${border}`,
                flexShrink: 0,
                transition: 'transform 0.12s',
                boxShadow: forceRed ? `0 0 0 3px ${OVERDUE_RED}22` : 'none',
              }}
                onMouseEnter={e => { if (!readOnly) e.currentTarget.style.transform = 'scale(1.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
              <span style={{
                fontSize: 9,
                color: '#7a8394',
                fontWeight: 500,
                textAlign: 'center',
                lineHeight: 1.2,
                maxWidth: 36,
                wordBreak: 'break-word',
              }}>
                {t(`stage_${stage}`)}
              </span>
            </div>


            {/* Connector spacer (no visible line) */}
            {!isLast && (
              <div style={{
                width: 8, height: 1,
                background: 'var(--pipeline-connector)',
                marginTop: 6,
                flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}

      {popup && (
        <StagePopup
          order={order}
          stage={popup.stage}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
