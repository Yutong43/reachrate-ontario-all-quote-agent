/* global globalThis */

globalThis.REACHRATE_ROUTES = {
  allstate: {
    name: "Allstate",
    // The public Ontario page opens Quick Quote in a second tab. Starting on
    // the intake keeps the supervised route session attached to the form.
    entryUrl: "https://apps.allstate.ca/quickquote/common/landing.aspx#b",
    hosts: ["allstate.ca"],
    underwriter: "Allstate Insurance Company of Canada",
    resultType: "quote"
  },
  aviva: {
    name: "Aviva Direct",
    entryUrl: "https://myaviva.avivainsurance.ca/avivaquoter/bol/auto/vehicle?lang=en",
    hosts: ["aviva.ca", "avivainsurance.ca"],
    underwriter: "S&Y Insurance Company",
    resultType: "quote"
  },
  squareone: {
    name: "Square One",
    entryUrl: "https://www.squareone.ca/car",
    hosts: ["squareone.ca"],
    underwriter: "Zurich Insurance Company Ltd (Canadian Branch)",
    resultType: "quote"
  },
  rates: {
    name: "Rates.ca",
    entryUrl: "https://rates.ca/insurance-quotes/auto/ontario",
    hosts: ["rates.ca"],
    underwriter: null,
    intermediary: "Rates.ca",
    resultType: "estimate"
  },
  td: {
    name: "TD Insurance",
    entryUrl: "https://www.tdinsurance.com/quote/car/ontario",
    hosts: ["tdinsurance.com"],
    underwriter: null,
    resultType: "quote"
  },
  caa: {
    name: "CAA Insurance",
    entryUrl: "https://car-insurance.caasco.com/auto/intro?refd=autoquote",
    hosts: ["caasco.com"],
    underwriter: "CAA Insurance Company",
    resultType: "quote"
  },
  desjardins: {
    name: "Desjardins Insurance",
    entryUrl: "https://clients.desjardinsgeneralinsurance.com/vehicle-quote/init/welcome?cs=au&mca=d&prv=on",
    hosts: ["desjardins.com"],
    underwriter: null,
    resultType: "quote"
  },
  belairdirect: {
    name: "belairdirect",
    entryUrl: "https://webquote.app.belairdirect.com/?language=en&province=on&f=c",
    hosts: ["belairdirect.com"],
    underwriter: "Belair Insurance Company Inc.",
    resultType: "quote"
  },
  sonnet: {
    name: "Sonnet",
    entryUrl: "https://www.sonnet.ca/auto-insurance",
    hosts: ["sonnet.ca"],
    underwriter: "Sonnet Insurance Company",
    resultType: "quote"
  },
  lowestrates: {
    name: "LowestRates.ca",
    entryUrl: "https://www.lowestrates.ca/insurance/auto/ontario",
    hosts: ["lowestrates.ca"],
    underwriter: null,
    intermediary: "LowestRates.ca",
    resultType: "estimate"
  },
  cooperators: {
    name: "Co-operators",
    entryUrl: "https://quoting.cooperators.ca/quote/IRAuto_CG?lang=en",
    hosts: ["cooperators.ca"],
    underwriter: "Co-operators General Insurance Company",
    resultType: "quote"
  },
  rbc: {
    name: "RBC Insurance",
    entryUrl: "https://www1.myrbcsso.rbcinsurance.com/ada/quoter?productType=auto&campaignID=E4APPON&lang=EN",
    hosts: ["rbcinsurance.com"],
    underwriter: null,
    intermediary: "RBC Insurance",
    resultType: "quote"
  },
  thepersonal: {
    name: "The Personal",
    entryUrl: "https://www.thepersonal.com/insurance/auto-insurance.html",
    hosts: ["thepersonal.com"],
    underwriter: "The Personal Insurance Company",
    resultType: "quote"
  },
  surex: {
    name: "Surex",
    entryUrl: "https://www.surex.com/insurance/auto/ontario",
    hosts: ["surex.com"],
    underwriter: null,
    intermediary: "Surex",
    resultType: "quote"
  },
  thinkinsure: {
    name: "ThinkInsure",
    entryUrl: "https://www.thinkinsure.ca/car-insurance/ontario-quote.php",
    hosts: ["thinkinsure.ca"],
    underwriter: null,
    intermediary: "ThinkInsure",
    resultType: "quote"
  },
  onlia: {
    name: "Onlia",
    entryUrl: "https://app.onlia.ca/#/auto/personal-info",
    hosts: ["onlia.ca"],
    underwriter: null,
    intermediary: "Onlia",
    resultType: "quote"
  },
  pcinsurance: {
    name: "PC Insurance",
    entryUrl: "https://quote.pcinsurance.ca/pci/quoter",
    hosts: ["pcinsurance.ca"],
    underwriter: null,
    intermediary: "PC Insurance",
    resultType: "quote"
  },
  inova: {
    name: "Inova",
    entryUrl: "https://quote.inovainc.ca/auto/get-started/?postal_code={postal}",
    hosts: ["inovainc.ca"],
    underwriter: null,
    intermediary: "Inova",
    resultType: "quote"
  },
  insurancehotline: {
    name: "InsuranceHotline.com",
    entryUrl: "https://www.insurancehotline.com/car-insurance-quotes",
    hosts: ["insurancehotline.com"],
    underwriter: null,
    intermediary: "InsuranceHotline.com",
    resultType: "estimate"
  }
};
