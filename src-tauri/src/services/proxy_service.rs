use std::collections::HashMap;

use crate::models::config::{CustomProxyConfig, ProxyConfig, ProxyMode, SystemProxyConfig};

pub fn get_effective_proxy_url(config: &ProxyConfig) -> Option<String> {
    match config.mode {
        ProxyMode::None => None,
        ProxyMode::System => get_system_proxy_url(config.system.as_ref()),
        ProxyMode::Custom => get_custom_proxy_url(config.custom.as_ref()),
    }
}

fn get_system_proxy_url(system_config: Option<&SystemProxyConfig>) -> Option<String> {
    let config = system_config?;

    let env_vars: HashMap<String, String> = std::env::vars()
        .filter(|(k, _)| {
            k == "HTTP_PROXY" || k == "HTTPS_PROXY" || k == "http_proxy" || k == "https_proxy"
        })
        .collect();

    let proxy_url = if config.prefer_https {
        env_vars
            .get("HTTPS_PROXY")
            .or_else(|| env_vars.get("https_proxy"))
            .or_else(|| env_vars.get("HTTP_PROXY"))
            .or_else(|| env_vars.get("http_proxy"))
    } else {
        env_vars
            .get("HTTP_PROXY")
            .or_else(|| env_vars.get("http_proxy"))
            .or_else(|| env_vars.get("HTTPS_PROXY"))
            .or_else(|| env_vars.get("https_proxy"))
    };

    proxy_url.cloned()
}

fn get_custom_proxy_url(custom_config: Option<&CustomProxyConfig>) -> Option<String> {
    let config = custom_config?;

    let protocol = if config.protocols.contains(&"https".to_string()) {
        "https"
    } else {
        "http"
    };

    Some(format!("{}://{}:{}", protocol, config.host, config.port))
}

pub fn get_no_proxy_list(config: &ProxyConfig) -> Vec<String> {
    match config.mode {
        ProxyMode::None => vec![],
        ProxyMode::System => std::env::var("NO_PROXY")
            .or_else(|_| std::env::var("no_proxy"))
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect(),
        ProxyMode::Custom => config
            .custom
            .as_ref()
            .map(|c| c.bypass.clone())
            .unwrap_or_default(),
    }
}

pub fn get_proxy_auth(config: &ProxyConfig) -> Option<(String, String)> {
    match config.mode {
        ProxyMode::None => None,
        ProxyMode::System => config.system.as_ref().and_then(|s| {
            if let (Some(username), Some(password)) = (&s.username, &s.password) {
                if !username.is_empty() {
                    return Some((username.clone(), password.clone()));
                }
            }
            None
        }),
        ProxyMode::Custom => config.custom.as_ref().and_then(|c| {
            if let (Some(username), Some(password)) = (&c.username, &c.password) {
                if !username.is_empty() {
                    return Some((username.clone(), password.clone()));
                }
            }
            None
        }),
    }
}

pub fn get_proxy_config_for_reqwest(config: &ProxyConfig) -> Option<reqwest::Proxy> {
    let url = get_effective_proxy_url(config)?;

    let mut proxy = reqwest::Proxy::all(&url).ok()?;

    if let Some((username, password)) = get_proxy_auth(config) {
        proxy = proxy.basic_auth(&username, &password);
    }

    let no_proxy = get_no_proxy_list(config);
    if !no_proxy.is_empty() {
        let no_proxy_str = no_proxy.join(",");
        proxy = proxy.no_proxy(reqwest::NoProxy::from_string(&no_proxy_str));
    }

    Some(proxy)
}
