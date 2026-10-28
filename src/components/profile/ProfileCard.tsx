import { useId, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react'
import type { CardId, CardStatus } from '@/lib/profileCards'
import { seekerCardCls } from './profileStyles'

// One card of the seeker profile: an icon, a title, an optional line saying what the card is for,
// and the card's content. The section is named by its title, so a screen reader lands on
// "Where I live" rather than on an anonymous block.
export function ProfileCard({
  icon: Icon,
  title,
  help,
  action,
  busy,
  legend,
  footer,
  cardId,
  children,
}: {
  icon: LucideIcon
  title: ReactNode
  help?: string
  /** Sits at the right of the header, e.g. an "Add" button. */
  action?: ReactNode
  /**
   * Set while the card is being saved or its save is being confirmed: every input, select and button
   * inside is disabled. Leave it undefined for a card that is never locked, and it renders as before.
   */
  busy?: boolean
  /**
   * The name a screen reader gives the group of fields while `busy` is set (the title as plain
   * text). Only used with `busy`; without it there is no fieldset and so no legend.
   */
  legend?: string
  /** Below the fields and OUTSIDE the disabled fieldset, so Save, Cancel and Check again stay live. */
  footer?: ReactNode
  /** Marks the section so the page can find the card to move keyboard focus into. Only set when cards are edited one by one. */
  cardId?: CardId
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={seekerCardCls} data-profile-card={cardId}>
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#eaf6fd] text-[#236987]"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-black">
              {title}
            </h2>
            {help && <p className="mt-0.5 text-sm text-gray-600">{help}</p>}
          </div>
        </div>
        {action}
      </div>
      {busy === undefined ? (
        children
      ) : (
        // A disabled fieldset turns off every native control inside it. It is reset to a plain block
        // (no border, padding, margin or minimum width) so it does not change the layout.
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          {legend && <legend className="sr-only">{legend}</legend>}
          {children}
        </fieldset>
      )}
      {footer}
    </section>
  )
}

const buttonCls =
  'inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-lg transition-colors disabled:opacity-60 aria-disabled:opacity-60 aria-disabled:cursor-not-allowed'

/**
 * A card's Save, Cancel and Check again, and the one line saying how the last save went. It sits
 * outside the card's disabled fieldset (see `footer`), so each button is switched off by its own
 * `disabled`, never by the fieldset. The status line is always rendered, empty when there is
 * nothing to say, so a screen reader is already listening when a message appears in it.
 *
 * "Saved" stays until the card is edited again (the page clears the status then); no timer.
 *
 * Save and Check again, while their own request is running, are `aria-disabled` and not `disabled`:
 * a disabled button drops keyboard focus, and the person who pressed it would be left nowhere. Their
 * click is ignored here (mouse, Enter and Space all arrive as a click), and the page's handlers
 * refuse a locked card as well. Cancel really is disabled. The `data-focus` markers are how the page
 * finds the button to focus.
 */
export function CardControls({
  card,
  editing,
  status,
  error,
  note,
  canCheck,
  saveDisabled,
  labels,
  onSave,
  onCancel,
  onCheck,
}: {
  /** Which card these controls belong to; handed back to the three handlers. */
  card: CardId
  editing: boolean
  status: CardStatus
  /** Why the last save failed or is not confirmed; '' when it has not. */
  error: string
  /** A line that is not a failure; '' when there is none. */
  note: string
  /** The last write of this card has an unconfirmed outcome, so "Check again" is offered. */
  canCheck: boolean
  /** Save is off for a reason the card's status does not say (another write is in flight). */
  saveDisabled: boolean
  labels: { save: string; saving: string; cancel: string; checkAgain: string; checking: string; saved: string }
  onSave: (card: CardId) => void
  onCancel: (card: CardId) => void
  onCheck: (card: CardId) => void
}) {
  const saving = status === 'saving'
  const checking = status === 'checking'
  // Saving, being read back or held: the draft is being judged, so neither Save nor Cancel may act.
  const locked = saving || checking || status === 'unknown'
  // The two states in which the button that was pressed is still the one in use.
  const running = saving || checking
  return (
    <div className="mt-5 space-y-3">
      {(editing || canCheck) && (
        <div className="flex flex-wrap items-center gap-3">
          {editing && (
            <>
              <button
                type="button"
                data-focus="save"
                onClick={() => {
                  if (!running) onSave(card)
                }}
                disabled={!running && (locked || saveDisabled)}
                aria-disabled={running || undefined}
                aria-busy={saving}
                className={`${buttonCls} bg-primary-50 text-primary-100 hover:bg-primary-60`}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {saving ? labels.saving : labels.save}
              </button>
              <button
                type="button"
                data-focus="cancel"
                onClick={() => onCancel(card)}
                disabled={locked}
                className={`${buttonCls} border border-gray-300 hover:bg-gray-50`}
              >
                {labels.cancel}
              </button>
            </>
          )}
          {canCheck && (
            <button
              type="button"
              data-focus="checkAgain"
              onClick={() => {
                if (!checking) onCheck(card)
              }}
              aria-disabled={checking || undefined}
              aria-busy={checking}
              className={`${buttonCls} border border-primary-50 text-primary-50 hover:bg-primary-10`}
            >
              {checking && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {checking ? labels.checking : labels.checkAgain}
            </button>
          )}
        </div>
      )}
      <div role="status" className="empty:hidden">
        {checking && !canCheck && (
          <p className="inline-flex items-center gap-1.5 text-sm text-[#717182]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {labels.checking}
          </p>
        )}
        {status === 'saved' && !error && (
          <p className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {labels.saved}
          </p>
        )}
        {note && !error && <p className="text-sm text-[#717182]">{note}</p>}
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" /> <span>{error}</span>
        </p>
      )}
    </div>
  )
}
