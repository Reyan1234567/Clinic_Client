import { forwardRef } from "react";
import { CLINIC } from "@/lib/clinic";
import { ageFromDateOfBirth, formatDateOnly, toDateKey } from "@/lib/format";
import type {
  BiopsyRequestData,
  MedicalCertificate,
  MedicalCertificateData,
  ReferralFormData,
  VisitDetail,
} from "@/lib/types";

function sexLabel(gender: VisitDetail["patient"]["gender"]) {
  return gender === "MALE" ? "Male" : "Female";
}

function lineRuleStyle(variant: "solid" | "dotted") {
  const ruleColor = "#444";

  if (variant === "dotted") {
    return {
      backgroundImage: `repeating-linear-gradient(to right, ${ruleColor} 0, ${ruleColor} 2px, transparent 2px, transparent 6px)`,
      backgroundSize: "100% 1px",
      backgroundPosition: "left bottom",
      backgroundRepeat: "repeat-x" as const,
    };
  }

  return {
    backgroundImage: `linear-gradient(${ruleColor}, ${ruleColor})`,
    backgroundSize: "100% 1px",
    backgroundPosition: "left bottom",
    backgroundRepeat: "no-repeat" as const,
  };
}

function Value({
  value,
  variant = "solid",
  className = "",
}: {
  value?: string | number | null;
  variant?: "solid" | "dotted";
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 flex-1 px-1 pb-0.5 break-words whitespace-pre-wrap leading-[22px] ${className}`}
      style={{ ...lineRuleStyle(variant), minHeight: 22 }}
    >
      {value || "\u00a0"}
    </div>
  );
}

function SignatureValue({
  url,
  variant = "solid",
}: {
  url?: string | null;
  variant?: "solid" | "dotted";
}) {
  return (
    <span
      className="relative min-w-[40px] flex-1 px-1 pb-0.5"
      style={lineRuleStyle(variant)}
    >
      {url ? (
        <img
          src={url}
          alt="Doctor signature"
          className="h-[26px] inline-block align-bottom"
        />
      ) : (
        "\u00a0"
      )}
    </span>
  );
}

const BiopsyPaper = forwardRef<
  HTMLDivElement,
  {
    visit: VisitDetail;
    data: BiopsyRequestData;
    signatureUrl?: string | null;
  }
>(function BiopsyPaper({ visit, data, signatureUrl }, ref) {
  const age = ageFromDateOfBirth(visit.patient.dateOfBirth) ?? "—";

  return (
    <div
      ref={ref}
      className="w-[210mm] min-h-[297mm] mx-auto p-[18mm_16mm] bg-white text-[#1a1a1a] text-[13px] font-['Times_New_Roman',Georgia,'Liberation_Serif',serif] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.08)] print:shadow-none print:w-auto print:min-h-0 print:p-[14mm]"
    >
      <header className="mb-10">
        <h2 className="text-[20px] font-bold uppercase tracking-wide">
          {CLINIC.nameEnglishSpeciality}
        </h2>
      </header>

      <h3 className="text-left text-[16px] mb-5">Biopsy examination request</h3>

      <section>
        <h4 className="mt-4 mb-2 text-[13px] italic font-normal">
          Requesting doctor
        </h4>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">Name</span>
          <Value variant="dotted" value={data.requestingDoctorName} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            Phone
          </span>
          <Value variant="dotted" value={data.requestingDoctorPhone} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            Signature
          </span>
          <SignatureValue variant="dotted" url={signatureUrl} />
        </div>
      </section>

      <section>
        <h4 className="mt-4 mb-2 text-[13px] italic font-normal">
          Patient information
        </h4>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">Name</span>
          <Value variant="dotted" value={visit.patient.fullName} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            Phone
          </span>
          <Value variant="dotted" value={visit.patient.phone} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5 flex-none basis-[220px] mr-6">
          <span className="flex-none whitespace-nowrap min-w-[90px]">Sex</span>
          <Value variant="dotted" value={sexLabel(visit.patient.gender)} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5 flex-none basis-[220px]">
          <span className="flex-none whitespace-nowrap min-w-[90px]">Age</span>
          <Value variant="dotted" value={age} />
        </div>
      </section>

      <section>
        <h4 className="mt-4 mb-2 text-[13px] italic font-normal">
          Physical examination
        </h4>
        <div className="mb-2">
          <span className="flex-none whitespace-nowrap min-w-[90px] text-[12px]">
            History
          </span>
        </div>
        <div className="flex items-start gap-1.5 mb-2.5">
          <Value variant="dotted" value={data.history} />
        </div>
        <div className="mb-2">
          <span className="flex-none whitespace-nowrap min-w-[90px] text-[12px]">
            Clinical appearance
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <Value variant="dotted" value={data.clinicalAppearance} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            Lesion location
          </span>
          <Value variant="dotted" value={data.lesionLocation} />
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            Type of biopsy
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 ml-6 mb-1.5">
          <span className="flex-none min-w-[110px]">Incisional</span>
          <Value
            variant="dotted"
            className="flex-none basis-[50px] text-center font-bold"
            value={data.biopsyType === "INCISIONAL" ? "✓" : ""}
          />
        </div>
        <div className="flex items-baseline gap-1.5 ml-6 mb-1.5">
          <span className="flex-none min-w-[110px]">Excisional</span>
          <Value
            variant="dotted"
            className="flex-none basis-[50px] text-center font-bold"
            value={data.biopsyType === "EXCISIONAL" ? "✓" : ""}
          />
        </div>
        <div className="flex items-baseline gap-1.5 ml-6 mb-1.5">
          <span className="flex-none min-w-[110px]">Biopsy date</span>
          <Value variant="dotted" value={formatDateOnly(data.biopsyDate)} />
        </div>
        <div className="flex items-baseline gap-1.5 ml-6 mb-1.5">
          <span className="flex-none min-w-[110px]">Clinical Impression</span>
          <Value variant="dotted" value={data.clinicalImpression} />
        </div>
      </section>
    </div>
  );
});

const MedicalCertificatePaper = forwardRef<
  HTMLDivElement,
  {
    visit: VisitDetail;
    data: MedicalCertificateData;
    doctorName: string;
    issued: string;
    signatureUrl?: string | null;
  }
>(function MedicalCertificatePaper(
  { visit, data, doctorName, issued, signatureUrl },
  ref,
) {
  const age = ageFromDateOfBirth(visit.patient.dateOfBirth) ?? "—";

  return (
    <div
      ref={ref}
      className="flex flex-col w-[210mm] min-h-[297mm] mx-auto p-[18mm_16mm] bg-white text-[#1a1a1a] text-[13px] font-[Calibri,'Segoe_UI',Arial,'Liberation_Sans',sans-serif] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.08)] print:shadow-none print:w-auto print:min-h-0 print:p-[14mm]"
    >
      <header className="mb-3.5">
        <div className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif] font-bold text-[35px] -mb-2">
          {CLINIC.nameAmharic}
        </div>
        <h2 className="text-[26px] font-bold font-['Times_New_Roman',Georgia,'Liberation_Serif',serif] tracking-wide">
          {CLINIC.nameEnglishSpeciality}
        </h2>
        <div className="text-[20px] font-bold font-serif">
          {CLINIC.phoneShort}
        </div>
        <div className="flex-col items-end mt-1.5 mb-10 flex gap-2 text-[15px]">
          <div className="flex items-baseline gap-1.5 font-bold">
            <span className="flex-none">MRN:</span>
            <Value
              variant="dotted"
              value={visit.patient.patientNumber}
              className="min-w-[90px] font-bold"
            />
          </div>
          <div className="flex items-baseline gap-1.5 font-bold">
            <span className="flex-none">DATE:</span>
            <Value
              variant="dotted"
              value={issued}
              className="min-w-[90px] font-bold"
            />
          </div>
        </div>
      </header>

      <h2 className="text-center my-2.5 mb-5 text-[22px] decoration-[1px] leading-relaxed font-bold font-['Times_New_Roman',Georgia,'Liberation_Serif',serif]">
        <u className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
          የህክምና የምስክር ወረቀት
        </u>
        <br />
        <u className="underline-offset-[1px] decoration-[1px] font-bold">
          Medical Certificate
        </u>
      </h2>

      <section>
        <div className="flex items-start gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            <span className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              የህመምተኛ ስም
            </span>
            <br />
            Patient name
          </span>
          <Value variant="dotted" value={visit.patient.fullName} />
        </div>
        <div className="flex items-start gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            <span className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              ዕድሜ
            </span>
            <br />
            Age
          </span>
          <Value variant="dotted" value={age} />
        </div>
        <div className="flex items-start gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            <span className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              የምርመራ ውጤት
            </span>
            <br />
            Diagnosis
          </span>
          <Value variant="dotted" value={data.diagnosis} />
        </div>
      </section>

      <section className="mt-2.5">
        <div className="flex items-baseline gap-4.5 mb-3">
          <div className="flex-1 flex items-baseline gap-1.5">
            <span className="flex-none font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              ከ / Treated From
            </span>
            <Value variant="dotted" value={formatDateOnly(data.treatedFrom)} />
          </div>
          <div className="flex-1 flex items-baseline gap-1.5">
            <span className="flex-none font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              እስከ / To
            </span>
            <Value variant="dotted" value={formatDateOnly(data.treatedTo)} />
          </div>
          <span className="flex-none font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
            ታክሟል።
          </span>
        </div>
        <div className="flex items-start gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            <span className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              የሐኪም እረፍት
            </span>
            <br />
            Res Required
          </span>
          <Value variant="dotted" value={data.restRequiredDays} />
        </div>
        <div className="flex items-start gap-1.5 mb-2.5">
          <span className="flex-none whitespace-nowrap min-w-[90px]">
            <span className="font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif]">
              አስተያየት
            </span>
            <br />
            Remark
          </span>
          <Value variant="dotted" value={data.remark} />
        </div>
      </section>

      <section className="ml-auto mt-auto flex flex-col gap-1.5 items-start text-[13px]">
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap">
            Doctor&apos;s Name
          </span>
          <Value
            variant="dotted"
            value={doctorName}
            className="max-w-[260px]"
          />
        </div>
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap">Signature</span>
          <SignatureValue variant="dotted" url={signatureUrl} />
        </div>
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap">Profession</span>
          <Value
            variant="dotted"
            value={CLINIC.profession}
            className="max-w-[260px]"
          />
        </div>
      </section>
    </div>
  );
});

const ReferralPaper = forwardRef<
  HTMLDivElement,
  {
    visit: VisitDetail;
    data: ReferralFormData;
    doctorName: string;
    issued: string;
    signatureUrl?: string | null;
  }
>(function ReferralPaper(
  { visit, data, doctorName, issued, signatureUrl },
  ref,
) {
  return (
    <div
      ref={ref}
      className="flex flex-col w-[210mm] min-h-[297mm] mx-auto p-[18mm_16mm] bg-white -mt-5 text-[#1a1a1a] text-[13px] font-[Calibri,'Segoe_UI',Arial,'Liberation_Sans',sans-serif] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.08)] print:shadow-none print:w-auto print:min-h-0 print:p-[14mm]"
    >
      <header className="mb-7.5 text-center">
        <div className="text-[30px] font-['Noto_Sans_Ethiopic','Abyssinica_SIL','Nyala',sans-serif] font-bold text-[17px] mb-0.5">
          {CLINIC.nameAmharic}
        </div>
        <h2 className="text-[26px] font-bold font-['Times_New_Roman',Georgia,'Liberation_Serif',serif] tracking-wide">
          {CLINIC.nameEnglishSpeciality}
        </h2>
        <div className="text-[18px] font-bold font-serif">{CLINIC.phone}</div>
      </header>

      <h2 className="text-center my-2.5 mb-5 text-[15px]">
        <u className="underline-offset-[3px] decoration-[1px] text-[20px] font-bold font-['Times_New_Roman',Georgia,'Liberation_Serif',serif]">
          REFRAL FORM
        </u>
      </h2>
      <div className="flex flex-col gap-x-2 gap-y-1 mb-4 text-[13px]">
        <div className="flex justify-between gap-x-2 gap-y-1 mb-4">
          <div className="flex min-w-0 flex-1 items-baseline gap-1.5 mb-1.5">
            <span className="flex-none font-bold whitespace-nowrap min-w-[20px]">
              Name
            </span>
            <Value variant="dotted" value={visit.patient.fullName} />
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5 flex-none">
            <span className="flex-none ml-5 font-bold whitespace-nowrap min-w-[20px]">
              Date
            </span>
            <Value variant="dotted" value={issued} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-1.5 w-full">
          <span className="flex-none font-bold whitespace-nowrap min-w-[50px]">MRN</span>
          <Value variant="dotted" value={visit.patient.patientNumber} />
        </div>
      </div>

      <section className="mb-4">
        <h4 className="mb-2 text-[13px] font-bold">
          History, Examination and Investigation
        </h4>
        <div className="flex items-start">
          <Value variant="dotted" value={data.historyExamInvestigation} />
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <strong className="flex-none whitespace-nowrap font-bold">
            Diagnostic Impression
          </strong>
          <Value variant="dotted" value={data.diagnosticImpression} />
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <strong className="flex-none whitespace-nowrap font-bold">
            Treatment Given:
          </strong>
          <Value variant="dotted" value={data.treatmentGiven} />
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <strong className="flex-none whitespace-nowrap font-bold">
            Reason for Referral:
          </strong>
          <Value variant="dotted" value={data.reasonForReferral} />
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <strong className="flex-none whitespace-nowrap font-bold">
            Feed Back:
          </strong>
          <Value variant="dotted" value={data.feedback} />
        </div>
      </section>

      <section className="mt-auto ml-auto flex flex-col gap-1.5 items-start text-[13px]">
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap font-bold">
            Doctors&apos; Name
          </span>
          <Value
            variant="dotted"
            value={doctorName}
            className="max-w-[260px]"
          />
        </div>
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap font-bold">
            Signature
          </span>
          <SignatureValue variant="dotted" url={signatureUrl} />
        </div>
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap font-bold">Date</span>
          <Value variant="dotted" value={issued} className="max-w-[260px]" />
        </div>
        <div className="flex w-full items-baseline gap-2">
          <span className="flex-none whitespace-nowrap font-bold">
            Profession
          </span>
          <Value
            variant="dotted"
            value={CLINIC.profession}
            className="max-w-[260px]"
          />
        </div>
      </section>
    </div>
  );
});

export const CertificatePaper = forwardRef<
  HTMLDivElement,
  {
    visit: VisitDetail;
    certificate: Pick<
      MedicalCertificate,
      "type" | "data" | "signatureFile" | "doctor" | "createdAt"
    >;
  }
>(function CertificatePaper({ visit, certificate }, ref) {
  const issued = formatDateOnly(certificate.createdAt);
  const signatureUrl = certificate.signatureFile.filePath;

  if (certificate.type === "BIOPSY_REQUEST") {
    return (
      <BiopsyPaper
        ref={ref}
        visit={visit}
        data={certificate.data as BiopsyRequestData}
        signatureUrl={signatureUrl}
      />
    );
  }

  if (certificate.type === "MEDICAL_CERTIFICATE") {
    return (
      <MedicalCertificatePaper
        ref={ref}
        visit={visit}
        data={certificate.data as MedicalCertificateData}
        doctorName={certificate.doctor.fullName}
        issued={issued}
        signatureUrl={signatureUrl}
      />
    );
  }

  return (
    <ReferralPaper
      ref={ref}
      visit={visit}
      data={certificate.data as ReferralFormData}
      doctorName={certificate.doctor.fullName}
      issued={issued}
      signatureUrl={signatureUrl}
    />
  );
});

export function certificatePrintTitle(
  certificate: Pick<MedicalCertificate, "type" | "createdAt">,
  patientName: string,
) {
  return `${certificate.type}-${patientName}-${toDateKey(certificate.createdAt)}`;
}
