import { useState, memo, useCallback, useEffect } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useSkillContext } from '../../contexts/SkillContext'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { t } from '../../i18n'
import { AlertDialog } from '../AlertDialog'
import type { AlertDialogState } from '../AlertDialog'
import type { TreeNode } from '../../types'

interface ImportButtonProps {
  language: 'zh' | 'en'
  slug: string | string[]
  sourceId: string
  isBatch?: boolean
}

interface ImportConfirmData {
  existing: string[]
  newSlugs: string[]
  allSlugs: string[]
  overwrite: boolean
}

export function ImportButton({ language, slug, sourceId, isBatch }: ImportButtonProps) {
  const { importSkills, importing, importProgress, checkDuplicates } = useClawhubStore()
  const { updateSkillTags, refreshSkillData } = useSkillContext()
  const { tree: tagTree, fetchTree: fetchTagTree } = useTagTreeStore()
  const [imported, setImported] = useState(false)
  const [localAlert, setLocalAlert] = useState<AlertDialogState | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmData, setConfirmData] = useState<ImportConfirmData>({ existing: [], newSlugs: [], allSlugs: [], overwrite: false })
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [tagSearchKeyword, setTagSearchKeyword] = useState('')
  const [expandedTagIds, setExpandedTagIds] = useState<Set<string>>(new Set())

  const slugs = Array.isArray(slug) ? slug : [slug]
  const isImporting = importing && importProgress?.currentSlug === slugs[0]

  useEffect(() => {
    fetchTagTree()
  }, [fetchTagTree])

  const handleClick = async () => {
    if (imported || isImporting) return

    try {
      const duplicates = await checkDuplicates(slugs)
      const existingSlugs = duplicates.filter(d => d.exists).map(d => d.slug)
      const newSlugs = duplicates.filter(d => !d.exists).map(d => d.slug)
      const slugsWithoutCheck = Array.from(slugs).filter(s => !duplicates.some(d => d.slug === s))

      setConfirmData({
        existing: existingSlugs,
        newSlugs: [...newSlugs, ...slugsWithoutCheck],
        allSlugs: Array.from(slugs),
        overwrite: existingSlugs.length > 0,
      })
      setSelectedTagIds(new Set())
      setTagSearchKeyword('')
      setExpandedTagIds(new Set())
      setShowConfirmDialog(true)
    } catch (error) {
      setLocalAlert({ title: 'ClawHub', message: String(error), type: 'error' })
    }
  }

  const handleConfirmImport = useCallback(async () => {
    const { allSlugs, overwrite } = confirmData
    try {
      setLocalAlert(null)
      const results = await importSkills(sourceId, allSlugs, overwrite)
      const allSuccess = results.every(r => r.success)
      if (allSuccess) {
        const successResults = results.filter(r => r.success)
        const tagIds = Array.from(selectedTagIds)
        if (tagIds.length > 0 && successResults.length > 0) {
          for (const result of successResults) {
            if (result.skill_id) {
              try {
                await updateSkillTags(result.skill_id, tagIds, { refresh: false })
              } catch (e) {
                console.error(`Failed to apply tags to skill ${result.slug}:`, e)
              }
            }
          }
        }
        setImported(true)
        await refreshSkillData()
      } else {
        const failed = results.filter(r => !r.success)
        setLocalAlert({ title: 'ClawHub', message: `${t('clawhubImportFailed', language)}: ${failed.map(r => r.error || r.slug).join(', ')}`, type: 'error' })
      }
    } catch (error) {
      setLocalAlert({ title: 'ClawHub', message: String(error), type: 'error' })
    }
    setShowConfirmDialog(false)
  }, [confirmData, selectedTagIds, importSkills, sourceId, updateSkillTags, refreshSkillData, language])

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const toggleTagExpand = useCallback((tagId: string) => {
    setExpandedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const hasMatchingDescendant = useCallback((node: TreeNode, search: string): boolean => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    for (const child of node.children) {
      if (child.tag.name.toLowerCase().includes(searchLower)) return true
      if (hasMatchingDescendant(child, search)) return true
    }
    return false
  }, [])

  const renderTagNode = useCallback((node: TreeNode, depth: number) => {
    const { tag } = node
    const isExpanded = expandedTagIds.has(tag.id)
    const isSelected = selectedTagIds.has(tag.id)
    const hasChildren = node.children.length > 0
    const matchesSearch = !tagSearchKeyword.trim() || tag.name.toLowerCase().includes(tagSearchKeyword.toLowerCase())

    if (tagSearchKeyword.trim() && !matchesSearch && !hasMatchingDescendant(node, tagSearchKeyword)) return null

    return (
      <div key={tag.id}>
        <div
          className={`repo-tag-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            className={`repo-tag-toggle ${!hasChildren ? 'invisible' : ''}`}
            onClick={() => toggleTagExpand(tag.id)}
          >
            {hasChildren && (
              <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                <path fill="currentColor" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          <button className="repo-tag-label" onClick={() => toggleTagSelection(tag.id)}>
            <span className="repo-tag-name">{tag.name}</span>
            {isSelected && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map(child => renderTagNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }, [expandedTagIds, selectedTagIds, tagSearchKeyword, hasMatchingDescendant, toggleTagExpand, toggleTagSelection])

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

      {showConfirmDialog && (
        <>
          <div className="repo-overlay" onClick={() => setShowConfirmDialog(false)} />
          <div className="repo-confirm-modal repo-import-confirm-modal">
            <div className="repo-confirm-icon repo-confirm-icon-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认导入' : 'Confirm Import'}</h3>
            <div className="repo-import-confirm-content">
              {confirmData.existing.length > 0 && (
                <div className="repo-import-existing">
                  <p className="repo-import-section-title">
                    {language === 'zh'
                      ? `以下 ${confirmData.existing.length} 个技能已存在，导入后将覆盖：`
                      : `${confirmData.existing.length} skill(s) already exist and will be overwritten:`}
                  </p>
                  <ul className="repo-import-skill-list">
                    {confirmData.existing.map(slug => (
                      <li key={slug}>{slug}</li>
                    ))}
                  </ul>
                </div>
              )}
              {confirmData.newSlugs.length > 0 && (
                <div className="repo-import-new">
                  <p className="repo-import-section-title">
                    {language === 'zh'
                      ? `以下 ${confirmData.newSlugs.length} 个技能将新增：`
                      : `${confirmData.newSlugs.length} skill(s) will be added:`}
                  </p>
                  <ul className="repo-import-skill-list">
                    {confirmData.newSlugs.map(slug => (
                      <li key={slug}>{slug}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="repo-import-tag-section">
                <p className="repo-import-section-title">
                  {language === 'zh' ? '添加标签（可选）' : 'Add Tags (optional)'}
                </p>
                <div className="repo-import-tag-search">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                    <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={tagSearchKeyword}
                    onChange={(e) => setTagSearchKeyword(e.target.value)}
                    placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                  />
                </div>
                <div className="repo-import-tag-tree">
                  {tagTree.length > 0 ? (
                    tagTree.map(node => renderTagNode(node, 0))
                  ) : (
                    <div className="repo-tag-empty">
                      {language === 'zh' ? '暂无可选标签' : 'No available tags'}
                    </div>
                  )}
                </div>
                {selectedTagIds.size > 0 && (
                  <div className="repo-import-selected-tags">
                    {language === 'zh'
                      ? `已选择 ${selectedTagIds.size} 个标签`
                      : `${selectedTagIds.size} tag${selectedTagIds.size > 1 ? 's' : ''} selected`}
                  </div>
                )}
              </div>
            </div>
            <div className="repo-confirm-actions">
              <button className="repo-btn-ghost" onClick={() => setShowConfirmDialog(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                className="repo-btn-primary"
                onClick={handleConfirmImport}
              >
                {language === 'zh' ? '确认导入' : 'Confirm Import'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}