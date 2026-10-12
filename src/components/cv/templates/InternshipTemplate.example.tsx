import InternshipTemplate from "./InternshipTemplate";
import { internshipPreviewData } from "@/data/internshipPreviewData";

export default function InternshipTemplateExample() {
  return (
    <div className="flex justify-center bg-gray-200 p-10">
      <InternshipTemplate data={internshipPreviewData} />
    </div>
  );
}
