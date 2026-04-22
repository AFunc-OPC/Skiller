import { useState, useEffect } from 'react'
import { configApi } from '../../api/config'
import type { ProxyConfig, ProxyMode } from '../../types'

interface ProxySettingsProps {
  language: 'zh' | 'en'
}

const PROXY_MODES: Array<{ key: ProxyMode; label: string; labelEn: string; desc: string; descEn: string }> = [
  { 
    key: 'none', 
    label: '不使用代理', 
    labelEn: 'No Proxy',
    desc: '应用直连网络，不使用任何代理',
    descEn: 'Connect directly without any proxy'
  },
  { 
    key: 'system', 
    label: '使用系统代理', 
    labelEn: 'Use System Proxy',
    desc: '自动读取 HTTP_PROXY、HTTPS_PROXY、NO_PROXY 环境变量',
    descEn: 'Automatically read HTTP_PROXY, HTTPS_PROXY, NO_PROXY environment variables'
  },
  { 
    key: 'custom', 
    label: '自定义代理', 
    labelEn: 'Custom Proxy',
    desc: '手动配置代理服务器地址和端口',
    descEn: 'Manually configure proxy server address and port'
  },
]

export function ProxySettings({ language }: ProxySettingsProps) {
  const [config, setConfig] = useState<ProxyConfig>({
    mode: 'none',
    system: { prefer_https: false },
    custom: { protocols: ['http'], host: '', port: 8080, bypass: [] },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [customHost, setCustomHost] = useState('')
  const [customPort, setCustomPort] = useState('8080')
  const [customUsername, setCustomUsername] = useState('')
  const [customPassword, setCustomPassword] = useState('')
  const [customBypass, setCustomBypass] = useState('')
  const [customHttp, setCustomHttp] = useState(true)
  const [customHttps, setCustomHttps] = useState(false)

  const [systemUsername, setSystemUsername] = useState('')
  const [systemPassword, setSystemPassword] = useState('')
  const [systemPreferHttps, setSystemPreferHttps] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const loadedConfig = await configApi.getProxyConfig()
      setConfig(loadedConfig)
      
      if (loadedConfig.system) {
        setSystemUsername(loadedConfig.system.username || '')
        setSystemPassword(loadedConfig.system.password || '')
        setSystemPreferHttps(loadedConfig.system.prefer_https || false)
      }
      
      if (loadedConfig.custom) {
        setCustomHost(loadedConfig.custom.host)
        setCustomPort(loadedConfig.custom.port.toString())
        setCustomUsername(loadedConfig.custom.username || '')
        setCustomPassword(loadedConfig.custom.password || '')
        setCustomBypass(loadedConfig.custom.bypass.join(', '))
        setCustomHttp(loadedConfig.custom.protocols.includes('http'))
        setCustomHttps(loadedConfig.custom.protocols.includes('https'))
      }
    } catch (err) {
      setError(language === 'zh' ? '加载配置失败' : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  const validate = (): string[] => {
    const errors: string[] = []
    
    if (config.mode === 'custom') {
      if (!customHost.trim()) {
        errors.push(language === 'zh' ? '请输入代理服务器地址' : 'Please enter proxy server address')
      }
      
      const portNum = parseInt(customPort, 10)
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(language === 'zh' ? '端口号必须在 1-65535 范围内' : 'Port must be between 1-65535')
      }
      
      if (!customHttp && !customHttps) {
        errors.push(language === 'zh' ? '请至少选择一个协议' : 'Please select at least one protocol')
      }
    }
    
    return errors
  }

  const handleSave = async () => {
    const errors = validate()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    
    setValidationErrors([])
    setSaving(true)
    setError(null)
    
    try {
      let newConfig: ProxyConfig = { mode: config.mode }
      
      if (config.mode === 'system') {
        newConfig.system = {
          prefer_https: systemPreferHttps,
          username: systemUsername || undefined,
          password: systemPassword || undefined,
        }
      } else if (config.mode === 'custom') {
        const protocols: string[] = []
        if (customHttp) protocols.push('http')
        if (customHttps) protocols.push('https')
        
        newConfig.custom = {
          protocols,
          host: customHost.trim(),
          port: parseInt(customPort, 10),
          username: customUsername || undefined,
          password: customPassword || undefined,
          bypass: customBypass.split(',').map(s => s.trim()).filter(s => s),
        }
      }
      
      await configApi.setProxyConfig(newConfig)
      setConfig(newConfig)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(language === 'zh' ? '保存配置失败' : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const handleModeChange = (mode: ProxyMode) => {
    setConfig(prev => ({ ...prev, mode }))
    setValidationErrors([])
  }

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-loading">
          {language === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      </div>
    )
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 className="settings-section-title">
          {language === 'zh' ? '代理设置' : 'Proxy Settings'}
        </h2>
        <p className="settings-section-desc">
          {language === 'zh' 
            ? '配置应用的网络代理，用于访问外部资源' 
            : 'Configure network proxy for accessing external resources'}
        </p>
      </div>

      <div className="settings-card">
        <div className="proxy-mode-selector">
          {PROXY_MODES.map((mode) => (
            <button
              key={mode.key}
              className={`proxy-mode-option ${config.mode === mode.key ? 'selected' : ''}`}
              onClick={() => handleModeChange(mode.key)}
            >
              <div className="proxy-mode-radio">
                <div className={`proxy-mode-radio-inner ${config.mode === mode.key ? 'checked' : ''}`} />
              </div>
              <div className="proxy-mode-content">
                <span className="proxy-mode-label">
                  {language === 'zh' ? mode.label : mode.labelEn}
                </span>
                <span className="proxy-mode-desc">
                  {language === 'zh' ? mode.desc : mode.descEn}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {config.mode === 'system' && (
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">
              {language === 'zh' ? '系统代理配置' : 'System Proxy Configuration'}
            </h3>
          </div>
          
          <div className="proxy-env-hint">
            {language === 'zh' 
              ? '系统将自动读取以下环境变量：HTTP_PROXY、HTTPS_PROXY、NO_PROXY' 
              : 'System will automatically read: HTTP_PROXY, HTTPS_PROXY, NO_PROXY'}
          </div>

          <div className="settings-form-group">
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={systemPreferHttps}
                onChange={(e) => setSystemPreferHttps(e.target.checked)}
              />
              <span>
                {language === 'zh' ? '优先使用 HTTPS_PROXY' : 'Prefer HTTPS_PROXY'}
              </span>
            </label>
          </div>

          <div className="settings-form-section">
            <h4 className="settings-form-section-title">
              {language === 'zh' ? '身份验证（可选）' : 'Authentication (Optional)'}
            </h4>
            
            <div className="settings-form-row">
              <label className="settings-form-label">
                {language === 'zh' ? '用户名' : 'Username'}
              </label>
              <input
                type="text"
                className="settings-form-input"
                value={systemUsername}
                onChange={(e) => setSystemUsername(e.target.value)}
                placeholder={language === 'zh' ? '留空则不使用身份验证' : 'Leave empty for no auth'}
              />
            </div>
            
            <div className="settings-form-row">
              <label className="settings-form-label">
                {language === 'zh' ? '密码' : 'Password'}
              </label>
              <input
                type="password"
                className="settings-form-input"
                value={systemPassword}
                onChange={(e) => setSystemPassword(e.target.value)}
                placeholder={language === 'zh' ? '留空则不使用身份验证' : 'Leave empty for no auth'}
              />
            </div>
          </div>
        </div>
      )}

      {config.mode === 'custom' && (
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">
              {language === 'zh' ? '自定义代理配置' : 'Custom Proxy Configuration'}
            </h3>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">
              {language === 'zh' ? '协议' : 'Protocol'}
            </label>
            <div className="settings-checkbox-group">
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={customHttp}
                  onChange={(e) => setCustomHttp(e.target.checked)}
                />
                <span>HTTP</span>
              </label>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={customHttps}
                  onChange={(e) => setCustomHttps(e.target.checked)}
                />
                <span>HTTPS</span>
              </label>
            </div>
          </div>

          <div className="settings-form-row">
            <label className="settings-form-label">
              {language === 'zh' ? '服务器地址' : 'Server Address'} *
            </label>
            <input
              type="text"
              className="settings-form-input"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="127.0.0.1"
            />
          </div>

          <div className="settings-form-row">
            <label className="settings-form-label">
              {language === 'zh' ? '端口' : 'Port'} *
            </label>
            <input
              type="number"
              className="settings-form-input"
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value)}
              min="1"
              max="65535"
              placeholder="8080"
            />
          </div>

          <div className="settings-form-section">
            <h4 className="settings-form-section-title">
              {language === 'zh' ? '身份验证（可选）' : 'Authentication (Optional)'}
            </h4>
            
            <div className="settings-form-row">
              <label className="settings-form-label">
                {language === 'zh' ? '用户名' : 'Username'}
              </label>
              <input
                type="text"
                className="settings-form-input"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder={language === 'zh' ? '留空则不使用身份验证' : 'Leave empty for no auth'}
              />
            </div>
            
            <div className="settings-form-row">
              <label className="settings-form-label">
                {language === 'zh' ? '密码' : 'Password'}
              </label>
              <input
                type="password"
                className="settings-form-input"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder={language === 'zh' ? '留空则不使用身份验证' : 'Leave empty for no auth'}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <label className="settings-form-label">
              {language === 'zh' ? '跳过代理' : 'Proxy Bypass'}
            </label>
            <input
              type="text"
              className="settings-form-input"
              value={customBypass}
              onChange={(e) => setCustomBypass(e.target.value)}
              placeholder={language === 'zh' ? 'localhost, 127.0.0.1（逗号分隔）' : 'localhost, 127.0.0.1 (comma separated)'}
            />
            <span className="settings-form-hint">
              {language === 'zh' ? '多个地址使用逗号分隔' : 'Separate multiple addresses with commas'}
            </span>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="settings-error-message">
          {validationErrors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      {error && (
        <div className="settings-error-message">{error}</div>
      )}

      {success && (
        <div className="settings-success-message">
          {language === 'zh' 
            ? '配置已保存，请重启应用以生效' 
            : 'Config saved. Please restart the app to apply changes.'}
        </div>
      )}

      <div className="settings-actions">
        <button
          className="settings-save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving 
            ? (language === 'zh' ? '保存中...' : 'Saving...') 
            : (language === 'zh' ? '保存并重启' : 'Save & Restart')}
        </button>
      </div>
    </div>
  )
}
