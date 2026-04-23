import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Search, Check, ArrowRight, AlertCircle, Download, AlertTriangle, Layers, Tag, Circle, Copy, Link } from 'lucide-react'
import { Skill, ToolPreset, TreeNode, SkillDistributionMode } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { useSkillContext } from '../../contexts/SkillContext'
import { configApi } from '../../api/config'
import { projectSkillApi } from '../../api/project'
import { TreeNode as TreeNodeComponent } from '../TagTree'
import './ProjectSkillImportDialog.css'

interface ProjectSkillImportDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onImport: (skillIds: string[], presetIds: string[], forceOverwrite: boolean, mode: SkillDistributionMode) => Promise<void>
}

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>
  
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const index = lowerText.indexOf(lowerKeyword)
  
  if (index === -1) return <>{text}</>
  
  const before = text.slice(0, index)
  const match = text.slice(index, index + keyword.length)
  const after = text.slice(index + keyword.length)
  
  return (
    <>
      {before}
      <span className="psi-highlight">{match}</span>
      {after}
    </>
  )
}

export function ProjectSkillImportDialog({
  isOpen,
  onClose,
  projectId,
  onImport,
}: ProjectSkillImportDialogProps) {
  const { language } = useAppStore()
  const { skills, filteredSkills: contextFilteredSkills, selectedTagId, setSelectedTag } = useSkillContext()
  const { tree, fetchTree } = useTagTreeStore()

  const [tagSearchKeyword, setTagSearchKeyword] = useState('')
  const [skillSearchKeyword, setSkillSearchKeyword] = useState('')
  const [presetSearchKeyword, setPresetSearchKeyword] = useState('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [toolPresets, setToolPresets] = useState<ToolPreset[]>([])
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set())
  const [importMode, setImportMode] = useState<SkillDistributionMode>('symlink')
  const [stage, setStage] = useState<'idle' | 'checking' | 'conflict' | 'importing' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [existingSkills, setExistingSkills] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setTagSearchKeyword('')
      setSkillSearchKeyword('')
      setPresetSearchKeyword('')
      setSelectedSkillIds(new Set())
      setSelectedPresetIds(new Set())
      setSelectedTag(null)
      setStage('idle')
      setError('')
      setExistingSkills([])
      fetchTree()

      configApi.getToolPresets().then((presets) => {
        setToolPresets(presets)
      })
    }
  }, [isOpen, fetchTree, setSelectedTag])

  const filteredSkills = useMemo(() => {
    let result = skills
    if (selectedTagId) {
      result = result.filter((skill) => skill.tags.includes(selectedTagId))
    }
    if (skillSearchKeyword.trim()) {
      const keyword = skillSearchKeyword.toLowerCase()
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(keyword) ||
          skill.file_path.toLowerCase().includes(keyword) ||
          (skill.description && skill.description.toLowerCase().includes(keyword))
      )
    }
    return result
  }, [skills, selectedTagId, skillSearchKeyword])

  const filteredTree = useMemo(() => {
    if (!tagSearchKeyword.trim()) return tree
    
    const keyword = tagSearchKeyword.toLowerCase()
    
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matchesSelf = node.tag.name.toLowerCase().includes(keyword)
        const filteredChildren = filterNodes(node.children)
        
        if (matchesSelf) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          })
        } else if (filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          })
        }
        
        return acc
      }, [])
    }
    
    return filterNodes(tree)
  }, [tree, tagSearchKeyword])

  const expandIdsToOpen = useMemo(() => {
    if (!tagSearchKeyword.trim()) return new Set<string>()
    
    const keyword = tagSearchKeyword.toLowerCase()
    const idsToExpand = new Set<string>()
    
    const collectParentIds = (nodes: TreeNode[], parentIds: string[] = []) => {
      for (const node of nodes) {
        if (node.tag.name.toLowerCase().includes(keyword)) {
          parentIds.forEach(id => idsToExpand.add(id))
        }
        if (node.children.length > 0) {
          collectParentIds(node.children, [...parentIds, node.tag.id])
        }
      }
    }
    
    collectParentIds(tree)
    return idsToExpand
  }, [tree, tagSearchKeyword])

  useEffect(() => {
    if (expandIdsToOpen.size > 0) {
      const { expandedIds, toggleExpanded } = useTagTreeStore.getState()
      expandIdsToOpen.forEach(id => {
        if (!expandedIds.has(id)) {
          toggleExpanded(id)
        }
      })
    }
  }, [expandIdsToOpen])

  const filteredPresets = useMemo(() => {
    if (!presetSearchKeyword.trim()) return toolPresets
    const keyword = presetSearchKeyword.toLowerCase()
    return toolPresets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(keyword) ||
        preset.skill_path.toLowerCase().includes(keyword)
    )
  }, [toolPresets, presetSearchKeyword])

  const allFilteredSelected =
    filteredSkills.length > 0 && filteredSkills.every((skill) => selectedSkillIds.has(skill.id))

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedSkillIds(new Set())
    } else {
      setSelectedSkillIds(new Set(filteredSkills.map((skill) => skill.id)))
    }
  }

  const handleToggleSkill = (skillId: string) => {
    const newSelected = new Set(selectedSkillIds)
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId)
    } else {
      newSelected.add(skillId)
    }
    setSelectedSkillIds(newSelected)
  }

  const handleTogglePreset = (presetId: string) => {
    const newSelected = new Set(selectedPresetIds)
    if (newSelected.has(presetId)) {
      newSelected.delete(presetId)
    } else {
      newSelected.add(presetId)
    }
    setSelectedPresetIds(newSelected)
  }

  const tagMap = useMemo(() => {
    const map = new Map<string, string>()
    const collectTags = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        map.set(node.tag.id, node.tag.name)
        if (node.children.length > 0) {
          collectTags(node.children)
        }
      }
    }
    collectTags(tree)
    return map
  }, [tree])

  const getTagName = (tagId: string): string => {
    return tagMap.get(tagId) || tagId
  }

  const getSkillName = (skillId: string): string => {
    const skill = skills.find((s) => s.id === skillId)
    return skill?.name || skillId
  }

  const handleImport = async () => {
    if (selectedSkillIds.size === 0 || selectedPresetIds.size === 0) return

    setStage('checking')
    setError('')

    try {
      const presetIds = Array.from(selectedPresetIds)
      const skillNames: string[] = []
      for (const skillId of selectedSkillIds) {
        const name = getSkillName(skillId)
        for (const presetId of presetIds) {
          const exists = await projectSkillApi.checkExists(projectId, presetId, name)
          if (exists) {
            skillNames.push(name)
          }
        }
      }

      if (skillNames.length > 0) {
        setExistingSkills(skillNames)
        setStage('conflict')
        return
      }

      await performImport(false)
    } catch (err) {
      setError((err as Error).message)
      setStage('error')
    }
  }

  const performImport = async (forceOverwrite: boolean) => {
    setStage('importing')
    setError('')

    try {
      await onImport(Array.from(selectedSkillIds), Array.from(selectedPresetIds), forceOverwrite, importMode)
      setStage('success')
      setTimeout(() => onClose(), 800)
    } catch (err) {
      setError((err as Error).message)
      setStage('error')
    }
  }

  const handleCancelConflict = () => {
    setStage('idle')
    setExistingSkills([])
  }

  const handleForceOverwrite = () => {
    performImport(true)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="psi-overlay" onClick={onClose} />
      <div className="psi-dialog">
        <div className="psi-header">
          <div className="psi-title">
            <div className="psi-title-icon">
              <Download />
            </div>
            <h3>{language === 'zh' ? '从技能中心导入' : 'Import from Skill Center'}</h3>
          </div>
          <button onClick={onClose} className="psi-close">
            <X />
          </button>
        </div>

        <div className="psi-body">
          <div className="psi-left">
            <div className="psi-left-top">
              <div className="psi-search">
                <Search className="psi-search-icon" />
                <input
                  type="search"
                  placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                  value={tagSearchKeyword}
                  onChange={(e) => setTagSearchKeyword(e.target.value)}
                  className="psi-search-input"
                />
                {tagSearchKeyword && (
                  <button className="psi-search-clear" onClick={() => setTagSearchKeyword('')}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              <div className="psi-tree">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`psi-tree-all ${selectedTagId === null ? 'active' : ''}`}
                >
                  <span className="flex-1">
                    {language === 'zh' ? '全部技能' : 'All Skills'}
                  </span>
                  <span className="psi-tree-count">{skills.length}</span>
                </button>

                {filteredTree.length > 0 ? (
                  <div className="psi-tree-nodes">
                    {filteredTree.map((node) => (
                      <TreeNodeComponent
                        key={node.tag.id}
                        node={node}
                        depth={0}
                        selectedTagId={selectedTagId}
                        onSelectTag={setSelectedTag}
                        highlightKeyword={tagSearchKeyword}
                      />
                    ))}
                  </div>
                ) : tagSearchKeyword.trim() ? (
                  <div className="psi-tree-empty">
                    {language === 'zh' ? '没有匹配的标签' : 'No matching tags'}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="psi-left-divider" />

            <div className="psi-preset-panel">
              <div className="psi-preset-header">
                <div className="psi-preset-header-left">
                  <Layers className="psi-preset-header-icon" />
                  <span>{language === 'zh' ? '目标预设' : 'Target Presets'}</span>
                  {selectedPresetIds.size > 0 && (
                    <span className="psi-preset-badge">{selectedPresetIds.size}</span>
                  )}
                </div>
                <div className="psi-preset-search">
                  <Search className="psi-preset-search-icon" />
                  <input
                    type="text"
                    placeholder={language === 'zh' ? '搜索...' : 'Search...'}
                    value={presetSearchKeyword}
                    onChange={(e) => setPresetSearchKeyword(e.target.value)}
                    className="psi-preset-search-input"
                  />
                  {presetSearchKeyword && (
                    <button className="psi-preset-search-clear" onClick={() => setPresetSearchKeyword('')}>
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              </div>
              <div className="psi-preset-list">
                {filteredPresets.length === 0 ? (
                  <div className="psi-preset-empty">
                    {toolPresets.length === 0
                      ? (language === 'zh' ? '暂无预设' : 'No presets')
                      : (language === 'zh' ? '没有匹配的预设' : 'No matching presets')}
                  </div>
                ) : (
                  filteredPresets.map((preset) => {
                    const isSelected = selectedPresetIds.has(preset.id)
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleTogglePreset(preset.id)}
                        className={`psi-preset-item ${isSelected ? 'selected' : ''}`}
                        title={preset.skill_path}
                      >
                        <div className={`psi-preset-check ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <div className="psi-preset-info">
                          <span className="psi-preset-name">
                            <HighlightText text={preset.name} keyword={presetSearchKeyword} />
                          </span>
                          <span className="psi-preset-path">
                            <HighlightText text={preset.skill_path} keyword={presetSearchKeyword} />
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="psi-right">
            <div className="psi-toolbar">
              <div className="psi-toolbar-search">
                <Search className="psi-toolbar-search-icon" />
                <input
                  type="text"
                  placeholder={language === 'zh' ? '搜索技能...' : 'Search skills...'}
                  value={skillSearchKeyword}
                  onChange={(e) => setSkillSearchKeyword(e.target.value)}
                  className="psi-toolbar-search-input"
                />
                {skillSearchKeyword && (
                  <button 
                    className="psi-search-clear"
                    onClick={() => setSkillSearchKeyword('')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSelectAll}
                disabled={filteredSkills.length === 0}
                className={`psi-select-all ${allFilteredSelected ? 'all-selected' : ''}`}
              >
                <div className={`psi-select-all-checkbox ${allFilteredSelected ? 'checked' : ''}`}>
                  {allFilteredSelected && <Check className="w-3 h-3" />}
                </div>
                {language === 'zh' ? '全选' : 'Select all'}
              </button>
            </div>

            <div className="psi-skills">
              {filteredSkills.length === 0 ? (
                <div className="psi-empty">
                  <p>{language === 'zh' ? '没有匹配的技能' : 'No matching skills'}</p>
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`psi-skill-item ${selectedSkillIds.has(skill.id) ? 'selected' : ''}`}
                  >
                    <div className={`psi-skill-checkbox ${selectedSkillIds.has(skill.id) ? 'checked' : ''}`}>
                      {selectedSkillIds.has(skill.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="psi-skill-content">
                      <div className="psi-skill-header">
                        <div className="psi-skill-name">
                          <HighlightText text={skill.name} keyword={skillSearchKeyword} />
                        </div>
                        <div className={`psi-skill-status ${skill.status}`}>
                          <Circle className="w-2 h-2" />
                          <span>{skill.status === 'available' 
                            ? (language === 'zh' ? '可用' : 'Available') 
                            : (language === 'zh' ? '禁用' : 'Disabled')}</span>
                        </div>
                      </div>
                      {skill.description && (
                        <div className="psi-skill-desc">
                          <HighlightText text={skill.description} keyword={skillSearchKeyword} />
                        </div>
                      )}
                      {skill.tags.length > 0 && (
                        <div className="psi-skill-tags">
                          <Tag className="w-2.5 h-2.5" />
                          {skill.tags.slice(0, 3).map((tag, index) => (
                            <span key={tag} className="psi-skill-tag">
                              {getTagName(tag)}
                            </span>
                          ))}
                          {skill.tags.length > 3 && (
                            <span className="psi-skill-tag-more">+{skill.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {stage === 'conflict' && (
          <div className="psi-conflict">
            <AlertTriangle className="psi-conflict-icon" />
            <div className="psi-conflict-content">
              <h4>{language === 'zh' ? '技能已存在' : 'Skills already exist'}</h4>
              <p>
                {language === 'zh'
                  ? `以下技能在项目中已存在：${existingSkills.join(', ')}`
                  : `These skills already exist in the project: ${existingSkills.join(', ')}`}
              </p>
            </div>
            <div className="psi-conflict-actions">
              <button className="psi-btn psi-btn-ghost" onClick={handleCancelConflict}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button className="psi-btn psi-btn-danger" onClick={handleForceOverwrite}>
                {language === 'zh' ? '强制覆盖' : 'Force Overwrite'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="psi-error">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="psi-footer">
          <div className="psi-footer-left">
            <div className="psi-footer-info">
              {selectedSkillIds.size > 0
                ? (language === 'zh'
                    ? `已选择 ${selectedSkillIds.size} 个技能`
                    : `${selectedSkillIds.size} skills selected`)
                : (language === 'zh' ? '请选择要导入的技能' : 'Select skills to import')}
              {selectedPresetIds.size > 0 && (
                <span className="psi-footer-divider">·</span>
              )}
              {selectedPresetIds.size > 0 && (
                <span className="psi-footer-preset-count">
                  {language === 'zh' 
                    ? `${selectedPresetIds.size} 个预设` 
                    : `${selectedPresetIds.size} presets`}
                </span>
              )}
            </div>

            <div className="psi-footer-mode">
              <button
                onClick={() => setImportMode('copy')}
                className={`psi-mode-toggle ${importMode === 'copy' ? 'active' : ''}`}
              >
                <Copy className="w-3 h-3" />
                <span>{language === 'zh' ? '复制' : 'Copy'}</span>
              </button>
              <button
                onClick={() => setImportMode('symlink')}
                className={`psi-mode-toggle ${importMode === 'symlink' ? 'active' : ''}`}
              >
                <Link className="w-3 h-3" />
                <span>{language === 'zh' ? '软链接' : 'Symlink'}</span>
              </button>
            </div>
          </div>

          <div className="psi-footer-actions">
            <button onClick={onClose} className="psi-btn psi-btn-ghost">
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleImport}
              disabled={selectedSkillIds.size === 0 || selectedPresetIds.size === 0 || stage === 'importing'}
              className="psi-btn psi-btn-primary"
            >
            {stage === 'importing' ? (
              <>
                <span className="psi-spinner" />
                {language === 'zh' ? '导入中...' : 'Importing...'}
              </>
            ) : stage === 'success' ? (
              language === 'zh' ? '导入成功' : 'Success'
            ) : (
              <>
                {language === 'zh' ? '导入' : 'Import'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
          </div>
        </div>
      </div>
    </>
  )
}
