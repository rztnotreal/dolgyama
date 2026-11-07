import { IconPlus, IconReturn, PitGlyph } from './Icons'

type View = 'pit' | 'ledger'

type HeaderProps = {
  view: View
  onViewChange: (view: View) => void
  onAddDebt: () => void
  onPay: () => void
  canPay: boolean
  demo: boolean
  onClearDemo: () => void
}

export function Header({ view, onViewChange, onAddDebt, onPay, canPay, demo, onClearDemo }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <div className="brand-wrap">
          <button
            type="button"
            className="brand"
            onClick={() => onViewChange('pit')}
            aria-label="Долговая яма — на главный экран"
          >
            <PitGlyph />
            <span>Долговая яма</span>
          </button>
          {demo ? (
            <button
              type="button"
              className="demo-badge"
              onClick={onClearDemo}
              title="Это пример данных. Нажмите, чтобы убрать."
            >
              пример
            </button>
          ) : null}
        </div>

        <div className="seg" role="tablist" aria-label="Режим отображения" data-view={view}>
          <span className="seg-thumb" aria-hidden />
          <button
            type="button"
            role="tab"
            id="tab-pit"
            className="seg-btn"
            aria-selected={view === 'pit'}
            aria-controls="view-pit"
            onClick={() => onViewChange('pit')}
          >
            Разрез
          </button>
          <button
            type="button"
            role="tab"
            id="tab-ledger"
            className="seg-btn"
            aria-selected={view === 'ledger'}
            aria-controls="view-ledger"
            onClick={() => onViewChange('ledger')}
          >
            Реестр
          </button>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPay}
            disabled={!canPay}
            title={canPay ? undefined : 'Открытых долгов нет'}
            aria-label="Вернуть деньги"
          >
            <IconReturn />
            <span className="btn-label-full">Вернуть деньги</span>
            <span className="btn-label-short">Вернуть</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddDebt}
            aria-label="Добавить долг"
          >
            <IconPlus />
            <span className="btn-label-full">Добавить долг</span>
            <span className="btn-label-short">Долг</span>
          </button>
        </div>
      </div>
    </header>
  )
}
