import puppeteer from "puppeteer-extra";
import UserAgent from "user-agents";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { google } from "googleapis";
import { faker } from "@faker-js/faker";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentialsPath = path.resolve(__dirname, "credentials.json");

const sheet_index = 0;

puppeteer.use(StealthPlugin());

let error = "";

const sheets = ["1_DycuMIRriWswO05PnMM1pxK6H3xQDyI0GO58tWawMI"]; // CONFERIR

const current_sheet = sheets[Number(sheet_index)];

function onlyNumbers(str) {
  return str.replace(/\D/g, "");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePassword() {
  let password = faker.internet.password(12, true);

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    if (!hasUpperCase) {
      password += faker.random.alpha({ count: 1, upcase: true });
    }
    if (!hasLowerCase) {
      password += faker.random.alpha({ count: 1, upcase: false });
    }
    if (!hasNumber) {
      password += faker.number.int({ min: 1, max: 4 });
    }

    password = faker.helpers.shuffle(password.split("")).join("");
  }

  return password;
}

function formatCpf(cpf) {
  cpf = cpf.replace(/\D/g, "");

  while (cpf.length < 11) {
    cpf = "0" + cpf;
  }

  const result = cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  return result;
}

async function fetchSheetData(spreadsheetId, range) {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (rows.length) {
      const jsonResult = rows.slice(1).map((row, index) => ({
        cpf: {
          value: row[0] || null,
          cellId: `A${index + 2}`,
        },
        email: {
          value: row[1] || null,
          cellId: `B${index + 2}`,
        },
        password: {
          value: row[2] || null,
          cellId: `C${index + 2}`,
        },
        result: {
          value: row[3] || null,
          cellId: `D${index + 2}`,
        },
        aff_link: {
          value: row[4] || null,
          cellId: `E${index + 2}`,
        },
        name: {
          value: row[5] || null,
          cellId: `F${index + 2}`,
        },
      }));

      return jsonResult;
    } else {
      return [];
    }
  } catch {
    error = "Error fetching data:" + error;
  }
}

const handleWithSheetData = async () => {
  try {
    const data = await fetchSheetData(current_sheet, "A:F");

    const filteredData = data.filter((f) => !f.result.value).slice(0, 1);

    let cpf;
    let name;
    let choosed;
    let url;

    if (Boolean(filteredData.length)) {
      cpf = formatCpf(filteredData[0].cpf.value);
      choosed = `Sheet1!${filteredData[0].email.cellId}:${filteredData[0].name.cellId}`;
      url = filteredData[0].aff_link.value;
      name = filteredData[0].name.value;
    } else {
      error = "No user data found.";
    }

    return { cpf, choosed, error, url, name };
  } catch (error) {
    error = "Error fetching data:" + error;
  }
};

const updateDataSheet = async (
  range,
  email,
  password,
  result,
  aff_link,
  name
) => {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const resource = {
    values: [[email, password, result, aff_link, name]],
  };

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: current_sheet,
      range,
      valueInputOption: "USER_ENTERED",
      resource,
    });
  } catch (error) {
    console.log(error);
    error = "Error fetching data:" + error;
  }
};

const delay = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const maxRetries = 50;

const waitForButtonSignUp = async (page) => {
  try {
    await page.waitForSelector(
      ".unauthed-buttons div:nth-of-type(2) > button.red.sign-up"
    );
    await page.click(
      ".unauthed-buttons div:nth-of-type(2) > button.red.sign-up"
    );
  } catch (error) {
    return waitForButtonSignUp(page);
  }
};

const createAccount = async (
  count = 0,
  beforePage = null,
  beforeBrowser = null
) => {
  let hasRequestError = false;
  let page = beforePage;
  let browser = beforeBrowser;

  if (!page && !browser) {
    const setup = await setupBrowser();
    page = setup.page;
    browser = setup.browser;
  }

  try {
    const data = await handleWithSheetData();

    let firstName = "";
    let lastName = "";

    if (data.name) {
      const names = data.name.toLowerCase().split(" ");
      firstName = names[0];
      lastName = names.slice(1)[randomInt(0, names.length - 2)];
    }

    const email =
      firstName && lastName
        ? faker.internet.email({ firstName, lastName })
        : faker.internet.email();
    const password = generatePassword();

    console.log("recomeçando");

    const currentUrl = page.url();
    const parsedCurrentUrl = new URL(currentUrl);
    const currentDomain = parsedCurrentUrl.hostname;

    if (currentDomain !== "jonbet.com") {
      await page.goto(data.url);
      console.log(`Navegando para: ${data.url}`);
    } else {
      console.log("Domínio atual é jonbet.com, não navegando.");
    }

    console.log("navigated");

    if (!count) {
      await waitForButtonSignUp(page);
    }

    await page.waitForSelector('input[name="username"]');
    await page.waitForSelector('input[name="password"]');
    await page.waitForSelector('input[name="cpf"]');

    await page.click('input[name="username"]');
    await page.focus('input[name="username"]');
    await page.evaluate(
      () => (document.querySelector('input[name="username"]').value = "")
    );
    await page.keyboard.type(email);

    await page.click('input[name="password"]');
    await page.focus('input[name="password"]');
    await page.evaluate(
      () => (document.querySelector('input[name="password"]').value = "")
    );
    await page.keyboard.type(password);

    await page.click('input[name="cpf"]');

    await page.$eval('input[name="cpf"]', (input) => input.select());

    await page.keyboard.press("Backspace");

    await page.type('input[name="cpf"]', onlyNumbers(data.cpf));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      for (const button of buttons) {
        if (button.innerText.toLowerCase().includes("comece já")) {
          button.click();
          break;
        }
      }
    });

    const response = await page.waitForResponse((response) =>
      response.url().includes("/api/auth/password")
    );

    if (response.status() >= 400) {
      const json = await response.json();
      const error = JSON.stringify(json);
      await updateDataSheet(data.choosed, email, password, error, data.url, "");
      hasRequestError = true;
      throw new Error(`Erro na requisição`);
    }

    return { email, password, data, browser, page, name: data.name };
  } catch (error) {
    if (!hasRequestError) {
      await browser.close();
      await delay(5000);
      return createAccount();
    } else {
      await delay(5000);
      return createAccount(1, page, browser);
    }
  }
};

const setupBrowser = async () => {
  const userAgent = new UserAgent().toString();

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--proxy-server=na.mrydtl5u.lunaproxy.net:12233",
    ],
  });

  const page = await browser.newPage();

  page.setDefaultTimeout(60000);

  await page.authenticate({
    username: "user-guigui_O7yaG-region-br",
    password: "159753acessoLu",
  });

  await page.setUserAgent(userAgent);
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const resourceType = request.resourceType();
    const url = request.url();

    // Bloquear imagens, fontes e folhas de estilo
    if (resourceType === "image" || resourceType === "font") {
      request.abort();
    }
    // Bloquear URLs de formatos específicos como SVG, OTF, WOFF2
    else if (/\.(svg|otf|woff2)$/i.test(url)) {
      request.abort();
    }
    // Bloquear URLs específicas (Google Tag Manager, Google Analytics)
    else if (
      url.includes("googletagmanager.com") ||
      url.includes("google-analytics.com") ||
      url.includes("gtag/js")
    ) {
      request.abort();
    }
    // Permitir todas as outras requisições
    else {
      request.continue();
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 300 && response.status() < 400) {
      console.log(
        `Redirecionamento detectado para: ${response.headers()["location"]}`
      );
    }
  });

  return { browser, page };
};

const run = async (attempt = 1) => {
  try {
    const account = await createAccount();
    const { data, email, password, page, browser, name } = account;

    console.log(
      `Conta criada com sucesso: ${account.email} ${account.password}`
    );

    await updateDataSheet(data.choosed, email, password, "Ok!", data.url, name);

    try {
      await page.waitForSelector(
        'button[data-testid="bonus-select-continue"]',
        { timeout: 5000 }
      );
    } catch (error) {}

    await delay(10000);
    await browser.close();

    await delay(randomInt(7500, 8600));

    return run();
  } catch (err) {
    console.error(`Tentativa ${attempt} falhou: ${err.message}`);

    if (attempt < maxRetries) {
      await browser.close();
      console.log(`Tentando novamente... (Tentativa ${attempt + 1})`);
      await delay(2000);
      return run(attempt + 1);
    } else {
      console.error("Número máximo de tentativas alcançado.");
      await updateDataSheet(
        data.choosed,
        email,
        password,
        err.message,
        data.url
      );
      await browser.close();
      await delay(2000);
      return run(attempt + 1);
    }
  }
};

run();
