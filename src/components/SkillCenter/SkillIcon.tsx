import { Skill } from '../../types'

const SKILL_COLORS = [
  '#FFE4E1',
  '#E0FFE0',
  '#E0FFFF',
  '#FFE4B5',
  '#E6E6FA',
  '#FFE4F3',
  '#F0FFF0',
  '#B0E0E6',
  '#AFEEEE',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getSkillColor(name: string): string {
  const hash = hashString(name)
  return SKILL_COLORS[hash % SKILL_COLORS.length]
}

interface SkillIconProps {
  skill: Skill
  size?: 'sm' | 'md' | 'lg'
}

export function SkillIcon({ skill, size = 'sm' }: SkillIconProps) {
  const bgColor = getSkillColor(skill.name)
  const initial = skill.name.charAt(0).toUpperCase()
  const sizeClass = size === 'sm' ? 'pm-icon-sm' : size === 'lg' ? 'pm-icon-lg' : 'pm-icon-md'
  
  return (
    <div 
      className={`pm-icon ${sizeClass}`}
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  )
}
