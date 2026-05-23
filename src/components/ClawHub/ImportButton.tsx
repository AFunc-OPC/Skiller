import { useState, memo } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { t } from '../../i18n'
import { AlertDialog } from '../AlertDialog'
import type { AlertDialogState } from '../AlertDialog'

interface ImportButtonProps {
  language: 'zh' | 'en'
  slug: string | string[]
  sourceId: string
  isBatch?: boolean
}

export function ImportButton({ language, slug, sourceId, isBatch }: ImportButtonProps) {
  const { importSkills, importing, importProgress, checkDuplicates } = useClawhubStore()
  const [imported, setImported] = useState(false)
  const [localAlert, setLocalAlert] = useState<AlertDialogState | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<{ slugs: string[]; duplicates: number } | null>(null)

  const slugs = Array.isArray(slug) ? slug : [slug]
  const isImporting = importing && importProgress?.currentSlug === slugs[0]

  const handleClick = async () => {
    if (imported || isImporting) return

    try {
      const duplicates = await checkDuplicates(slugs)
      const existingDuplicates = duplicates.filter(d => d.exists)
      
      if (existingDuplicates.length > 0) {
        if (isBatch && existingDuplicates.length > 1) {
          setDuplicateInfo({ slugs, duplicates: existingDuplicates.length })
          setShowDuplicateDialog(true)
          return
        }
        setDuplicateInfo({ slugs, duplicates: 1 })
        setShowDuplicateDialog(true)
        return
      }

      await doImport(slugs, false)
    } catch (error) {
      setLocalAlert({ title: 'ClawHub', message: String(error), type: 'error' })
    }
  }

  const doImport = async (slugsToImport: string[], overwrite: boolean) => {
    try {
      setLocalAlert(null)
      const results = await importSkills(sourceId, slugsToImport, overwrite)
      const allSuccess = results.every(r => r.success)
      if (allSuccess) {
        setImported(true)
      } else {
        const failed = results.filter(r => !r.success)
        setLocalAlert({ title: 'ClawHub', message: `${t('clawhubImportFailed', language)}: ${failed.map(r => r.error || r.slug).join(', ')}`, type: 'error' })
      }
    } catch (error) {
      setLocalAlert({ title: 'ClawHub', message: String(error), type: 'error' })
    }
    setShowDuplicateDialog(false)
    setDuplicateInfo(null)
  }

  if (imported) {
    return (
      <span className="clawhub-import-btn imported">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8.5l3.5 3.5 6.5-7" />
        </svg>
        {t('clawhubAlreadyImported', language)}
      </span>
    )
  }

  return (
    <>
      <button
        className={`clawhub-import-btn ${isImporting ? 'importing' : ''}`}
        onClick={handleClick}
        disabled={isImporting}
      >
        {isImporting ? (
          <>
            <div className="clawhub-spinner-small" />
            {t('clawhubImporting', language)}
          </>
        ) : isBatch ? (
          t('clawhubImportToCenter', language)
        ) : (
          <>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v8M4 7l4 4 4-4" />
              <path d="M2 12h12" />
            </svg>
            {t('clawhubImportToCenter', language)}
          </>
        )}
      </button>

      {localAlert && (
        <AlertDialog dialog={localAlert} onClose={() => setLocalAlert(null)} confirmLabel={language === 'zh' ? '确定' : 'OK'} />
      )}

      {showDuplicateDialog && duplicateInfo && (
        <div className="pm-overlay" onClick={() => { setShowDuplicateDialog(false); setDuplicateInfo(null) }}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h2>{t('clawhubDuplicateDetected', language)}</h2>
            </div>
            <div className="pm-modal-body">
              {isBatch && duplicateInfo.duplicates > 1 ? (
                <p>{language === 'zh'
                  ? `${duplicateInfo.duplicates} 个技能已存在。`
                  : `${duplicateInfo.duplicates} skills already exist.`}</p>
              ) : (
                <p>{t('clawhubDuplicateDetected', language)}</p>
              )}
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-ghost" onClick={() => { setShowDuplicateDialog(false); setDuplicateInfo(null) }}>
                {t('clawhubCancel', language)}
              </button>
              {isBatch && duplicateInfo.duplicates > 1 && (
                <button className="pm-btn-ghost" onClick={() => {
                  const nonDuplicateSlugs = slugs.filter(s => !duplicateInfo.slugs.includes(s))
                  doImport(nonDuplicateSlugs, false)
                }}>
                  {t('clawhubSkipDuplicates', language)}
                </button>
              )}
              <button className="pm-btn-primary" onClick={() => doImport(slugs, true)}>
                {t('clawhubOverwrite', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}