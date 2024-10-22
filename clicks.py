import time
import os
import zipfile
import string
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import undetected_chromedriver as uc

# Lista de proxies a serem usados
proxies = [
    "user-guigui_O7yaG:159753acessoLu@pr.mrydtl5u.lunaproxy.net:12233",
    # Adicione outros proxies aqui se necessário
]

# Lista de links para acessar
links = [
    "https://jonbet.cxclick.com/visit/?bta=36010&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=38177&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=59810&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=64617&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=55502&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=37898&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=39163&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=61273&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=61280&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=65277&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=67767&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=65445&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=68988&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=68987&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=68989&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=68996&brand=jonbet",
    "https://jonbet.cxclick.com/visit/?bta=68990&brand=jonbet"
]

# Função para criar a extensão de proxy com autenticação
def create_proxy_extension(proxy_host, proxy_port, proxy_user, proxy_pass):
    pluginfile = f'proxy_auth_plugin_{random.randint(10000, 99999)}.zip'
    manifest_json = """
    {
        "version": "1.0.0",
        "manifest_version": 2,
        "name": "Chrome Proxy",
        "permissions": [
            "proxy",
            "tabs",
            "unlimitedStorage",
            "storage",
            "<all_urls>",
            "webRequest",
            "webRequestBlocking"
        ],
        "background": {
            "scripts": ["background.js"]
        },
        "minimum_chrome_version":"22.0.0"
    }
    """
    background_js = string.Template("""
    var config = {
        mode: "fixed_servers",
        rules: {
            singleProxy: {
                scheme: "http",
                host: "${proxy_host}",
                port: parseInt(${proxy_port})
            },
            bypassList: ["localhost"]
        }
    };
    chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});

    function callbackFn(details) {
        return {
            authCredentials: {
                username: "${proxy_user}",
                password: "${proxy_pass}"
            }
        };
    }

    chrome.webRequest.onAuthRequired.addListener(
        callbackFn,
        {urls: ["<all_urls>"]},
        ["blocking"]
    );
    """).substitute(
        proxy_host=proxy_host,
        proxy_port=proxy_port,
        proxy_user=proxy_user,
        proxy_pass=proxy_pass
    )
    with zipfile.ZipFile(pluginfile, 'w') as zp:
        zp.writestr("manifest.json", manifest_json.strip())
        zp.writestr("background.js", background_js.strip())
    return pluginfile

# Função para configurar o navegador com um proxy específico do Luna Proxy
def start_browser_with_proxy(proxy):
    try:
        credentials, host_port = proxy.split('@')
        username, password = credentials.split(':')
        host, port = host_port.split(':')
    except Exception as e:
        print(f"Formato de proxy inválido: {e}")
        return None

    proxy_extension_file = create_proxy_extension(host, port, username, password)

    options = Options()
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_extension(proxy_extension_file)

    driver = uc.Chrome(options=options)

    os.remove(proxy_extension_file)

    return driver

# Função para gerar um delay aleatório entre 5 e 20 segundos
def random_delay(min_seconds=5, max_seconds=20):
    delay = random.uniform(min_seconds, max_seconds)
    time.sleep(delay)

# Função para acessar os links com delay aleatório em loop infinito
def simulate_clicks():
    while True:  # Loop infinito
        for link in links:
            for proxy in proxies:
                try:
                    print(f"Usando o proxy: {proxy}")
                    driver = start_browser_with_proxy(proxy)
                    if driver is None:
                        continue  # Pula para o próximo proxy se falhar ao iniciar o navegador

                    # Acessa o link
                    driver.get(link)

                    # Delay aleatório entre 3 e 7 segundos antes de atualizar
                    random_delay(3, 7)

                    # Atualiza a página
                    driver.refresh()

                    # Delay aleatório entre 5 e 20 segundos antes de fechar
                    random_delay(5, 20)

                    driver.quit()
                    break  # Sai do loop de proxies após o sucesso
                except Exception as e:
                    print(f"Erro ao acessar o link: {e}")
                    driver.quit()  # Fecha o navegador se houver erro

# Executa a função
simulate_clicks()
