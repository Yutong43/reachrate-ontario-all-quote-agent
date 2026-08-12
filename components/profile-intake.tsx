"use client";

import { useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  CircleHelp,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  cleanDemoProfile,
  profileSteps,
  type DriverProfile,
  type ProfileStepId,
} from "@/lib/demo-flow";

type ProfileIntakeProps = {
  profile: DriverProfile;
  step: ProfileStepId;
  profileLoaded: boolean;
  accurateConfirmed: boolean;
  searchAuthorized: boolean;
  onChange: <K extends keyof DriverProfile>(
    key: K,
    value: DriverProfile[K],
  ) => void;
  onStepChange: (step: ProfileStepId) => void;
  onLoadDemo: () => void;
  onClear: () => void;
  onAccurateConfirmed: (checked: boolean) => void;
  onSearchAuthorized: (checked: boolean) => void;
  onStartSearch: () => void;
};

const modelOptions: Record<string, string[]> = {
  Honda: ["Civic LX-B 4DR", "Accord EX", "CR-V LX AWD"],
  Toyota: ["Corolla LE", "Camry SE", "RAV4 XLE AWD"],
  Hyundai: ["Elantra Preferred", "Sonata Preferred-Trend", "Tucson Preferred AWD"],
  Mazda: ["Mazda3 GS", "CX-5 GS AWD", "CX-30 GX"],
};

function ChoiceButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-xl border px-4 text-sm font-bold transition ${
        selected
          ? "border-[#dfa861] bg-[#e8b978] text-white shadow-sm"
          : "border-[#cfd2d0] bg-white text-[#3c4b55] hover:border-[#9ebfc4]"
      }`}
    >
      {children}
    </button>
  );
}

function FormLabel({ children, help }: { children: React.ReactNode; help?: string }) {
  return (
    <span className="mb-2 flex items-center justify-between gap-3 text-sm font-extrabold text-[#2d3d47]">
      {children}
      {help && (
        <span className="group relative inline-flex text-[#83c9d3]">
          <CircleHelp size={18} aria-label={help} />
          <span className="pointer-events-none absolute right-0 top-7 z-20 hidden w-56 rounded-xl bg-[#20313d] p-3 text-xs font-medium leading-5 text-white shadow-lg group-hover:block">
            {help}
          </span>
        </span>
      )}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#9b617d]">
          {eyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-[-0.045em] text-[#263640]">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6e7a81]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function DriverStep({
  profile,
  onChange,
}: Pick<ProfileIntakeProps, "profile" | "onChange">) {
  const [addressVisible, setAddressVisible] = useState(false);

  return (
    <>
      <SectionHeading
        eyebrow="Step 1 · driver profile"
        title="First, tell us about you."
        description="Use one coherent clean profile for the supervised quote search. Sensitive credentials stay out of saved evidence."
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label>
          <FormLabel>First name</FormLabel>
          <input
            className="form-control"
            value={profile.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            autoComplete="given-name"
          />
        </label>
        <label>
          <FormLabel>Last name</FormLabel>
          <input
            className="form-control"
            value={profile.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            autoComplete="family-name"
          />
        </label>
        <label>
          <FormLabel help="Used to answer age and licensing questions consistently across routes.">
            Date of birth
          </FormLabel>
          <input
            className="form-control"
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="YYYY-MM-DD"
            pattern="\d{4}-\d{2}-\d{2}"
            maxLength={10}
            aria-label="Date of birth (YYYY-MM-DD)"
            value={profile.dateOfBirth}
            onChange={(event) => onChange("dateOfBirth", event.target.value)}
          />
        </label>
        <label>
          <FormLabel help="Some Ontario quote forms require this rating field. TD's tested web route sends X to phone support.">
            Gender field used by quote forms
          </FormLabel>
          <select
            className="form-control"
            value={profile.gender}
            onChange={(event) =>
              onChange("gender", event.target.value as DriverProfile["gender"])
            }
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="x">X</option>
          </select>
        </label>
        <label>
          <FormLabel help="Use an Ontario postal code that matches the test profile.">
            Home postal code
          </FormLabel>
          <input
            className="form-control uppercase"
            value={profile.postalCode}
            onChange={(event) => onChange("postalCode", event.target.value.toUpperCase())}
            autoComplete="postal-code"
            placeholder="M2N 0C1"
          />
        </label>
        <div className="md:col-span-2">
          <label htmlFor="street-address">
            <FormLabel help="Optional until a live route asks for it. It stays in this browser session and is never written to quote evidence.">
              Full residential / garaging address · session only
            </FormLabel>
          </label>
          <div className="relative">
            <input
              id="street-address"
              className={`form-control pr-14 ${addressVisible ? "" : "privacy-mask"}`}
              type="text"
              value={profile.streetAddress}
              onChange={(event) => onChange("streetAddress", event.target.value)}
              autoComplete="street-address"
              placeholder="Required by TD, CAA, Co-operators, Square One and Surex"
              aria-describedby="street-address-privacy-note"
            />
            <button
              type="button"
              onClick={() => setAddressVisible((visible) => !visible)}
              aria-label={addressVisible ? "Hide full residential address" : "Show full residential address"}
              aria-pressed={addressVisible}
              title={addressVisible ? "Hide address" : "Show address"}
              className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#6f8189] transition hover:bg-[#eef8f9] hover:text-[#3d7881] focus-visible:outline-none"
            >
              {addressVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          <span id="street-address-privacy-note" className="mt-2 block text-xs leading-5 text-[#7b878d]">
            ReachRate asks for route-specific approval before the extension may prefill this value. You still select any official address suggestion yourself.
          </span>
        </div>
        <label>
          <FormLabel help="Optional. Comparison and broker routes commonly require this before revealing results.">
            Contact email · session only
          </FormLabel>
          <input
            className="form-control"
            type="email"
            value={profile.contactEmail}
            onChange={(event) => onChange("contactEmail", event.target.value)}
            autoComplete="email"
            placeholder="Required by comparison routes"
          />
        </label>
        <label>
          <FormLabel help="Optional. It is never sent to an insurer or broker until you approve that specific route.">
            Contact phone · session only
          </FormLabel>
          <input
            className="form-control"
            type="tel"
            value={profile.contactPhone}
            onChange={(event) => onChange("contactPhone", event.target.value)}
            autoComplete="tel"
            placeholder="Required by comparison routes"
          />
        </label>
        <label>
          <FormLabel>Ontario licence class</FormLabel>
          <select
            className="form-control"
            value={profile.licenceClass}
            onChange={(event) =>
              onChange("licenceClass", event.target.value as DriverProfile["licenceClass"])
            }
          >
            <option value="G">G</option>
            <option value="G2">G2</option>
            <option value="G1">G1</option>
          </select>
        </label>
        <label>
          <FormLabel help="Choose transferred if you exchanged a licence from another Canadian province, U.S. state or another country. Do not invent Ontario G1 or G2 dates.">
            Ontario licensing path
          </FormLabel>
          <select
            className="form-control"
            value={profile.licensingHistory}
            onChange={(event) => {
              const value = event.target.value as DriverProfile["licensingHistory"];
              onChange("licensingHistory", value);
              if (value === "transferred") {
                onChange("g1LicenceDate", "");
                onChange("g2LicenceDate", "");
                onChange("gLicenceDate", "");
              } else {
                onChange("licenceOrigin", "Ontario");
                onChange("ontarioLicenceIssueDate", "");
              }
            }}
          >
            <option value="ontario_graduated">Ontario G1 → G2 → G</option>
            <option value="transferred">Transferred to Ontario</option>
          </select>
        </label>
        <label>
          <FormLabel>Year first licensed in Canada / U.S.</FormLabel>
          <input
            className="form-control"
            inputMode="numeric"
            value={profile.firstLicensedYear}
            onChange={(event) => onChange("firstLicensedYear", event.target.value)}
            placeholder="2015"
          />
        </label>
        {profile.licensingHistory === "transferred" ? (
          <>
            <label>
              <FormLabel>Province / country first licensed</FormLabel>
              <input
                className="form-control"
                value={profile.licenceOrigin}
                onChange={(event) => onChange("licenceOrigin", event.target.value)}
                placeholder="e.g. Nova Scotia"
              />
            </label>
            <label>
              <FormLabel help="Optional unless an official quote form specifically asks when your Ontario licence was issued or exchanged.">
                Ontario licence issue / transfer date · optional
              </FormLabel>
              <input
                className="form-control"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM"
                pattern="\d{4}-\d{2}"
                maxLength={7}
                value={profile.ontarioLicenceIssueDate}
                onChange={(event) => onChange("ontarioLicenceIssueDate", event.target.value)}
              />
            </label>
            <div className="md:col-span-2 rounded-xl border border-[#c9e4e5] bg-[#f1fafa] px-4 py-3 text-xs leading-5 text-[#527178]">
              G1 and G2 dates are not requested for a transferred licence. ReachRate uses your truthful first-licensed year and only asks for additional history if an official route requires it.
            </div>
          </>
        ) : (
          <>
            <label>
              <FormLabel>G1 licence date</FormLabel>
              <input
                className="form-control"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM"
                pattern="\d{4}-\d{2}"
                maxLength={7}
                value={profile.g1LicenceDate}
                onChange={(event) => onChange("g1LicenceDate", event.target.value)}
              />
            </label>
            <label>
              <FormLabel>G2 licence date</FormLabel>
              <input
                className="form-control"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM"
                pattern="\d{4}-\d{2}"
                maxLength={7}
                value={profile.g2LicenceDate}
                onChange={(event) => onChange("g2LicenceDate", event.target.value)}
              />
            </label>
            <label>
              <FormLabel>Full G licence date</FormLabel>
              <input
                className="form-control"
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM"
                pattern="\d{4}-\d{2}"
                maxLength={7}
                value={profile.gLicenceDate}
                onChange={(event) => onChange("gLicenceDate", event.target.value)}
              />
            </label>
          </>
        )}
        <label>
          <FormLabel>Marital status</FormLabel>
          <select
            className="form-control"
            value={profile.maritalStatus}
            onChange={(event) =>
              onChange("maritalStatus", event.target.value as DriverProfile["maritalStatus"])
            }
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="common_law">Common-law</option>
          </select>
        </label>
        <label>
          <FormLabel>Employment status</FormLabel>
          <select
            className="form-control"
            value={profile.employmentStatus}
            onChange={(event) =>
              onChange(
                "employmentStatus",
                event.target.value as DriverProfile["employmentStatus"],
              )
            }
          >
            <option value="employed">Employed</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#edf8f5] p-4 text-sm leading-6 text-[#42665f]">
        <Fingerprint className="mt-0.5 shrink-0" size={19} />
        <p>
          The saved profile uses a planned 2025 Toyota Corolla LE, 5,000 km/year and a clean G-licence history. Licence number and VIN are never generated or stored. Address, email and phone remain session-only and are redacted from saved evidence.
        </p>
      </div>
    </>
  );
}

function VehicleStep({
  profile,
  onChange,
}: Pick<ProfileIntakeProps, "profile" | "onChange">) {
  const models = modelOptions[profile.vehicleMake] ?? modelOptions.Honda;

  return (
    <>
      <SectionHeading
        eyebrow="Step 2 · vehicle"
        title="Give us the scoop on your four-wheeled friend."
        description="A VIN is optional for planning. If a route requires one, the Agent records the blocker instead of inventing it."
      />

      <div className="mt-8 rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-5">
        <FormLabel>Are you insuring a car you own or one you plan to buy?</FormLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceButton
            selected={profile.vehicleRelationship === "planned"}
            onClick={() => onChange("vehicleRelationship", "planned")}
          >
            Preparing to buy
          </ChoiceButton>
          <ChoiceButton
            selected={profile.vehicleRelationship === "owned"}
            onClick={() => onChange("vehicleRelationship", "owned")}
          >
            Already own
          </ChoiceButton>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3">
          <input
            type="checkbox"
            checked={profile.hasVin}
            onChange={(event) => onChange("hasVin", event.target.checked)}
            className="mt-1 size-4 accent-[#72bdc8]"
          />
          <span>
            <span className="block text-sm font-extrabold text-[#31434d]">I already have the VIN</span>
            <span className="mt-0.5 block text-xs leading-5 text-[#77848b]">
              Leave unchecked for the Judge-approved planned-vehicle profile.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label>
          <FormLabel>Car year</FormLabel>
          <select
            className="form-control"
            value={profile.vehicleYear}
            onChange={(event) => onChange("vehicleYear", event.target.value)}
          >
            {["2026", "2025", "2024", "2023", "2022", "2021", "2020"].map(
              (year) => (
                <option key={year}>{year}</option>
              ),
            )}
          </select>
        </label>
        <label>
          <FormLabel>Manufacturer</FormLabel>
          <select
            className="form-control"
            value={profile.vehicleMake}
            onChange={(event) => {
              const make = event.target.value;
              onChange("vehicleMake", make);
              onChange("vehicleModel", modelOptions[make][0]);
            }}
          >
            {Object.keys(modelOptions).map((make) => (
              <option key={make}>{make}</option>
            ))}
          </select>
        </label>
        <label>
          <FormLabel>Model / trim</FormLabel>
          <select
            className="form-control"
            value={profile.vehicleModel}
            onChange={(event) => onChange("vehicleModel", event.target.value)}
          >
            {models.map((model) => (
              <option key={model}>{model}</option>
            ))}
          </select>
        </label>
        <div>
          <FormLabel>Was this car new or used?</FormLabel>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton
              selected={profile.vehicleCondition === "new"}
              onClick={() => onChange("vehicleCondition", "new")}
            >
              New
            </ChoiceButton>
            <ChoiceButton
              selected={profile.vehicleCondition === "used"}
              onClick={() => onChange("vehicleCondition", "used")}
            >
              Used
            </ChoiceButton>
          </div>
        </div>
        <label>
          <FormLabel>Owned, financed or leased?</FormLabel>
          <select
            className="form-control"
            value={profile.vehicleOwnership}
            onChange={(event) =>
              onChange(
                "vehicleOwnership",
                event.target.value as DriverProfile["vehicleOwnership"],
              )
            }
          >
            <option value="owned">Owned</option>
            <option value="financed">Financed</option>
            <option value="leased">Leased</option>
          </select>
        </label>
        <label>
          <FormLabel>Annual kilometres</FormLabel>
          <select
            className="form-control"
            value={profile.annualKilometres}
            onChange={(event) => onChange("annualKilometres", event.target.value)}
          >
            {["5000", "8000", "10000", "15000", "20000", "30000"].map((value) => (
              <option key={value} value={value}>
                {Number(value).toLocaleString()} km
              </option>
            ))}
          </select>
        </label>
        <label>
          <FormLabel>Primary use</FormLabel>
          <select
            className="form-control"
            value={profile.primaryUse}
            onChange={(event) =>
              onChange("primaryUse", event.target.value as DriverProfile["primaryUse"])
            }
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </label>
        <label>
          <FormLabel>One-way commute</FormLabel>
          <select
            className="form-control"
            value={profile.commuteKilometres}
            onChange={(event) => onChange("commuteKilometres", event.target.value)}
          >
            <option value="0">No commute</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
            <option value="40">40+ km</option>
          </select>
        </label>
        <label>
          <FormLabel>Where is the car kept overnight?</FormLabel>
          <select
            className="form-control"
            value={profile.overnightParking}
            onChange={(event) =>
              onChange(
                "overnightParking",
                event.target.value as DriverProfile["overnightParking"],
              )
            }
          >
            <option value="private_garage">Private garage</option>
            <option value="driveway">Driveway</option>
            <option value="street">Street</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div>
          <FormLabel>Winter tires?</FormLabel>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton selected={profile.winterTires} onClick={() => onChange("winterTires", true)}>
              Yes
            </ChoiceButton>
            <ChoiceButton selected={!profile.winterTires} onClick={() => onChange("winterTires", false)}>
              No
            </ChoiceButton>
          </div>
        </div>
      </div>
    </>
  );
}

function HistoryStep({
  profile,
  onChange,
}: Pick<ProfileIntakeProps, "profile" | "onChange">) {
  return (
    <>
      <SectionHeading
        eyebrow="Step 3 · driving history"
        title="A clean record helps more routes return a rate."
        description="Use your accurate driving history for live insurer routes. ReachRate records clean outcomes and blockers without inventing licence details."
      />
      <div className="mt-8 space-y-5">
        {[
          {
            label: "At-fault claims in the last 6 years",
            key: "claimsLastSixYears" as const,
            value: profile.claimsLastSixYears,
            options: ["0", "1", "2+"],
          },
          {
            label: "Driving convictions in the last 3 years",
            key: "convictionsLastThreeYears" as const,
            value: profile.convictionsLastThreeYears,
            options: ["0", "1", "2+"],
          },
          {
            label: "Licence suspensions in the last 6 years",
            key: "suspensionsLastSixYears" as const,
            value: profile.suspensionsLastSixYears,
            options: ["0", "1+"],
          },
        ].map((question) => (
          <div key={question.key} className="rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-5">
            <FormLabel>{question.label}</FormLabel>
            <div className={`grid gap-3 ${question.options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {question.options.map((option) => (
                <ChoiceButton
                  key={option}
                  selected={question.value === option}
                  onClick={() =>
                    onChange(
                      question.key,
                      option as DriverProfile[typeof question.key],
                    )
                  }
                >
                  {option === "0" ? "None" : option}
                </ChoiceButton>
              ))}
            </div>
          </div>
        ))}
        <label className="block rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-5">
          <FormLabel>Continuous prior insurance</FormLabel>
          <select
            className="form-control"
            value={profile.continuousInsuranceYears}
            onChange={(event) =>
              onChange(
                "continuousInsuranceYears",
                event.target.value as DriverProfile["continuousInsuranceYears"],
              )
            }
          >
            <option value="0">No prior insurance</option>
            <option value="1-2">1–2 years</option>
            <option value="3-5">3–5 years</option>
            <option value="5+">5+ years</option>
          </select>
        </label>
      </div>
    </>
  );
}

function CoverageStep({
  profile,
  onChange,
}: Pick<ProfileIntakeProps, "profile" | "onChange">) {
  return (
    <>
      <SectionHeading
        eyebrow="Step 4 · coverage benchmark"
        title="Compare like with like."
        description="Prices are ranked only when their liability limit, deductibles and core coverages match this baseline."
      />

      <div className="mt-7 rounded-2xl border-l-4 border-[#c97b24] bg-[#fff9e9] p-5 text-sm leading-6 text-[#74430e]">
        <p className="font-black">Ontario Accident Benefits update · effective July 1, 2026</p>
        <p className="mt-1">
          The demo benchmark includes standard mandatory benefits and labels optional enhancements separately.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <FormLabel>Third-party liability</FormLabel>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton
              selected={profile.liabilityLimit === "1000000"}
              onClick={() => onChange("liabilityLimit", "1000000")}
            >
              $1 million
            </ChoiceButton>
            <ChoiceButton
              selected={profile.liabilityLimit === "2000000"}
              onClick={() => onChange("liabilityLimit", "2000000")}
            >
              $2 million
            </ChoiceButton>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FormLabel>Comprehensive coverage</FormLabel>
            <div className="grid grid-cols-2 gap-3">
              <ChoiceButton
                selected={profile.comprehensiveCoverage}
                onClick={() => onChange("comprehensiveCoverage", true)}
              >
                Yes
              </ChoiceButton>
              <ChoiceButton
                selected={!profile.comprehensiveCoverage}
                onClick={() => onChange("comprehensiveCoverage", false)}
              >
                No
              </ChoiceButton>
            </div>
          </div>
          <div>
            <FormLabel>Collision coverage</FormLabel>
            <div className="grid grid-cols-2 gap-3">
              <ChoiceButton
                selected={profile.collisionCoverage}
                onClick={() => onChange("collisionCoverage", true)}
              >
                Yes
              </ChoiceButton>
              <ChoiceButton
                selected={!profile.collisionCoverage}
                onClick={() => onChange("collisionCoverage", false)}
              >
                No
              </ChoiceButton>
            </div>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FormLabel>Collision / comprehensive deductible</FormLabel>
            <select
              className="form-control"
              value={profile.deductible}
              onChange={(event) =>
                onChange("deductible", event.target.value as DriverProfile["deductible"])
              }
            >
              <option value="500">$500</option>
              <option value="1000">$1,000</option>
              <option value="2000">$2,000</option>
            </select>
          </label>
          <label>
            <FormLabel>Ideal policy start date</FormLabel>
            <input
              className="form-control"
              type="text"
              inputMode="numeric"
              placeholder="YYYY-MM-DD"
              pattern="\d{4}-\d{2}-\d{2}"
              maxLength={10}
              aria-label="Ideal policy start date (YYYY-MM-DD)"
              value={profile.policyStartDate}
              onChange={(event) => onChange("policyStartDate", event.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-4">
            <input
              type="checkbox"
              checked={profile.opcf44r}
              onChange={(event) => onChange("opcf44r", event.target.checked)}
              className="mt-1 size-4 accent-[#72bdc8]"
            />
            <span>
              <span className="block text-sm font-black text-[#31434d]">OPCF 44R</span>
              <span className="mt-1 block text-xs leading-5 text-[#748189]">
                Family protection endorsement included in the benchmark.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-4">
            <input
              type="checkbox"
              checked={profile.telematics}
              onChange={(event) => onChange("telematics", event.target.checked)}
              className="mt-1 size-4 accent-[#72bdc8]"
            />
            <span>
              <span className="block text-sm font-black text-[#31434d]">Usage-based telematics</span>
              <span className="mt-1 block text-xs leading-5 text-[#748189]">
                Off by default so prices remain comparable without tracking.
              </span>
            </span>
          </label>
        </div>
      </div>
    </>
  );
}

function ReviewStep({
  profile,
  accurateConfirmed,
  searchAuthorized,
  onAccurateConfirmed,
  onSearchAuthorized,
  onStartSearch,
}: Pick<
  ProfileIntakeProps,
  | "profile"
  | "accurateConfirmed"
  | "searchAuthorized"
  | "onAccurateConfirmed"
  | "onSearchAuthorized"
  | "onStartSearch"
>) {
  return (
    <>
      <SectionHeading
        eyebrow="Step 5 · review and authorize"
        title="One profile. You choose every destination."
        description="Review the shared facts, authorize safe route attempts, then inspect the exact insurer, broker and comparison-platform plan before anything runs."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-5">
          <div className="flex items-center gap-2 text-sm font-black text-[#31434d]">
            <UserRound size={18} className="text-[#6db9c4]" />
            Driver
          </div>
          <p className="mt-3 text-lg font-black">
            {profile.firstName || "—"} {profile.lastName}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#6f7d84]">
            {profile.licenceClass} licence · {profile.gender.toUpperCase()} · first licensed {profile.firstLicensedYear || "—"} · {profile.postalCode || "Postal code missing"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7b878d]">
            {profile.licensingHistory === "transferred"
              ? `Transferred from ${profile.licenceOrigin || "another jurisdiction"}${profile.ontarioLicenceIssueDate ? ` · Ontario licence issued ${profile.ontarioLicenceIssueDate}` : ""}`
              : `G1 ${profile.g1LicenceDate || "—"} · G2 ${profile.g2LicenceDate || "—"} · G ${profile.gLicenceDate || "—"}`}
          </p>
          <p className="mt-2 text-xs font-bold text-[#3d806f]">
            Clean record: {profile.claimsLastSixYears === "0" && profile.convictionsLastThreeYears === "0" ? "Yes" : "No"}
          </p>
          <p className="mt-2 text-xs font-bold text-[#8a6429]">
            Live-route unlocks: {profile.streetAddress ? "address ready" : "address missing"} · {profile.contactEmail && profile.contactPhone ? "contact ready" : "contact missing"}
          </p>
          <p className="mt-2 text-[0.7rem] leading-5 text-[#7b878d]">
            Licence number is never generated or stored here; enter your real number only on an official insurer page when required.
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-5">
          <div className="flex items-center gap-2 text-sm font-black text-[#31434d]">
            <CarFront size={18} className="text-[#d39a50]" />
            Planned vehicle
          </div>
          <p className="mt-3 text-lg font-black">
            {profile.vehicleYear} {profile.vehicleMake} {profile.vehicleModel}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#6f7d84]">
            {Number(profile.annualKilometres).toLocaleString()} km/year · {profile.vehicleOwnership} · {profile.hasVin ? "VIN available" : "No VIN"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-5 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-black text-[#31434d]">
            <ShieldCheck size={18} className="text-[#8e6580]" />
            Comparison benchmark
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              `$${Number(profile.liabilityLimit).toLocaleString()} liability`,
              `$${Number(profile.deductible).toLocaleString()} deductible`,
              profile.collisionCoverage ? "Collision" : "No collision",
              profile.comprehensiveCoverage ? "Comprehensive" : "No comprehensive",
              profile.opcf44r ? "OPCF 44R" : "No OPCF 44R",
              profile.telematics ? "Telematics" : "No telematics",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#d7dcda] bg-white px-3 py-1.5 text-xs font-bold text-[#53646d]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d8e4df] bg-[#f2faf6] p-4">
          <input
            type="checkbox"
            checked={accurateConfirmed}
            onChange={(event) => onAccurateConfirmed(event.target.checked)}
            className="mt-1 size-4 accent-[#4f9b84]"
          />
          <span className="text-sm leading-6 text-[#3f5e54]">
            I confirm this information is accurate for my personal quote search.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d8e4df] bg-[#f2faf6] p-4">
          <input
            type="checkbox"
            checked={searchAuthorized}
            onChange={(event) => onSearchAuthorized(event.target.checked)}
            className="mt-1 size-4 accent-[#4f9b84]"
          />
          <span className="text-sm leading-6 text-[#3f5e54]">
            I authorize ReachRate to use this profile to attempt selected quote routes. It may collect prices and blockers, but it may not bind, purchase or provide insurance advice.
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={onStartSearch}
        disabled={!accurateConfirmed || !searchAuthorized}
        className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#9fd5dc] px-6 text-sm font-black text-[#173f45] shadow-sm transition hover:bg-[#8bcbd4] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Review market plan
        <ArrowRight size={18} />
      </button>
    </>
  );
}

export function ProfileIntake({
  profile,
  step,
  profileLoaded,
  accurateConfirmed,
  searchAuthorized,
  onChange,
  onStepChange,
  onLoadDemo,
  onClear,
  onAccurateConfirmed,
  onSearchAuthorized,
  onStartSearch,
}: ProfileIntakeProps) {
  const stepIndex = profileSteps.findIndex((item) => item.id === step);
  const canContinue =
    step !== "driver" ||
    Boolean(
      profile.firstName &&
        profile.lastName &&
        profile.dateOfBirth &&
        profile.postalCode &&
        profile.firstLicensedYear,
    );

  function goBack() {
    const previous = profileSteps[Math.max(0, stepIndex - 1)];
    onStepChange(previous.id);
  }

  function goNext() {
    const next = profileSteps[Math.min(profileSteps.length - 1, stepIndex + 1)];
    onStepChange(next.id);
  }

  return (
    <>
      <section className="border-b border-black/[0.06] bg-white/90">
        <div className="mx-auto flex max-w-[1220px] flex-col justify-between gap-5 px-5 py-8 md:flex-row md:items-center md:px-8">
          <div>
            <p className="text-2xl font-black tracking-[-0.035em] text-[#263640]">
              Car Insurance Quote Profile
            </p>
            <p className="mt-1 text-sm text-[#697780]">
              {profile.postalCode ? `Ontario postal code: ${profile.postalCode}` : "Build one reusable profile before the Agent shops routes."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#a9dce3] bg-white px-5 text-sm font-black text-[#68aeb8] transition hover:bg-[#edf9fa]"
          >
            <RotateCcw size={16} />
            Clear form
          </button>
        </div>
        <div className="h-1.5 bg-[#f8edf3]">
          <div
            className="h-full rounded-r-full bg-[#e7bdd2] transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / profileSteps.length) * 100}%` }}
          />
        </div>
      </section>

      <main className="mx-auto grid max-w-[1120px] gap-8 px-5 py-10 lg:grid-cols-[270px_minmax(0,720px)] lg:gap-12 lg:px-8 lg:py-14">
        <aside className="h-fit rounded-[18px] border border-black/[0.06] bg-white p-5 shadow-[0_12px_30px_rgba(213,163,187,0.12)] lg:sticky lg:top-24">
          <section className={`mb-6 rounded-[16px] border p-4 ${profileLoaded ? "border-[#b8dfd2] bg-[#edf8f4]" : "border-[#dfbdd0] bg-[#fff8fb]"}`}>
            <div className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8c5c75]"><UserRound size={15} /> Existing profile</div>
            <p className="mt-3 text-sm font-black text-[#2f424b]">{cleanDemoProfile.firstName} {cleanDemoProfile.lastName} · {cleanDemoProfile.licenceClass} licence</p>
            <p className="mt-1 text-[0.68rem] leading-5 text-[#6f7c82]">{cleanDemoProfile.vehicleYear} {cleanDemoProfile.vehicleMake} {cleanDemoProfile.vehicleModel} · {Number(cleanDemoProfile.annualKilometres).toLocaleString("en-CA")} km/year · {cleanDemoProfile.postalCode} · clean record</p>
            <button
              type="button"
              onClick={() => {
                onLoadDemo();
                onStepChange("review");
              }}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#253640] px-3 text-xs font-black text-white"
            >
              {profileLoaded ? <Check size={15} /> : <Sparkles size={15} />}
              {profileLoaded ? "Existing profile selected" : "Use existing profile"}
            </button>
          </section>

          <div className="border-t border-black/[0.06] pt-5">
          <ol>
            {profileSteps.map((item, index) => {
              const selected = item.id === step;
              const completed = index < stepIndex;
              return (
                <li key={item.id} className="relative pb-7 last:pb-0">
                  {index < profileSteps.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-[#d6d9d7]" />
                  )}
                  <button
                    type="button"
                    onClick={() => onStepChange(item.id)}
                    className="group relative z-10 flex w-full items-start gap-4 text-left"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-black transition ${
                        selected
                          ? "border-[#8fcfd8] bg-white text-[#3b7e88] shadow-[0_2px_9px_rgba(222,178,200,0.28)]"
                          : completed
                            ? "border-[#90c9b9] bg-[#edf8f4] text-[#3f806f]"
                            : "border-[#d8d9d7] bg-white text-[#8b969b]"
                      }`}
                    >
                      {completed ? <Check size={14} /> : index + 1}
                    </span>
                    <span>
                      <span className={`block text-sm font-black ${selected ? "text-[#263640]" : "text-[#55656e]"}`}>
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-[#8a959a]">
                        {item.note}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          </div>
          <div className="mt-7 border-t border-[#d9dbd9] pt-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#455760]">
              <Clock3 size={18} className="text-[#83cbd4]" />
              Estimated 3 minutes
            </div>
            <p className="mt-3 text-xs leading-5 text-[#7b888f]">
            Load your saved profile shell, complete the missing date of birth and any route-specific fields, then start the supervised run.
            </p>
          </div>
        </aside>

        <section className="h-fit rounded-[18px] border border-black/[0.06] bg-white p-6 shadow-[0_14px_34px_rgba(213,163,187,0.12)] md:p-8">
          {step === "driver" && (
            <DriverStep
              profile={profile}
              onChange={onChange}
            />
          )}
          {step === "vehicle" && <VehicleStep profile={profile} onChange={onChange} />}
          {step === "history" && <HistoryStep profile={profile} onChange={onChange} />}
          {step === "coverage" && <CoverageStep profile={profile} onChange={onChange} />}
          {step === "review" && (
            <ReviewStep
              profile={profile}
              accurateConfirmed={accurateConfirmed}
              searchAuthorized={searchAuthorized}
              onAccurateConfirmed={onAccurateConfirmed}
              onSearchAuthorized={onSearchAuthorized}
              onStartSearch={onStartSearch}
            />
          )}

          {step !== "review" && (
            <div className="mt-8 flex items-center justify-between border-t border-black/[0.07] pt-6">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-[#64747d] disabled:opacity-25"
              >
                <ArrowLeft size={17} />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#9fd5dc] px-6 text-sm font-black text-[#173f45] shadow-sm transition hover:bg-[#8bcbd4] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continue
                <ArrowRight size={17} />
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
