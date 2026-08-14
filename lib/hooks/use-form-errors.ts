import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/types";

/**
 * A 422 carries `details` as `{ field: string[] }`. Those belong on the inputs
 * they describe, not in a toast, so the user can see which value to correct.
 * Anything that is not field-shaped falls back to a toast.
 *
 * Returns true when the error was placed on the form.
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: {
    /** Route a non-422 status onto a specific field, e.g. 409 -> appointmentTime. */
    statusFieldMap?: Partial<Record<number, Path<T>>>;
    /** Suppress the fallback toast when the caller renders the error itself. */
    silent?: boolean;
  } = {},
) {
  if (!(error instanceof ApiError)) {
    if (!options.silent) toast.error("Something went wrong");
    return false;
  }

  const fieldErrors = error.fieldErrors;

  if (fieldErrors) {
    let placed = false;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages[0];
      if (!message) continue;
      setError(field as Path<T>, { type: "server", message });
      placed = true;
    }
    if (placed) return true;
  }

  const mapped = options.statusFieldMap?.[error.status];
  if (mapped) {
    setError(mapped, { type: "server", message: error.message });
    return true;
  }

  if (!options.silent) toast.error(error.message);
  return false;
}
