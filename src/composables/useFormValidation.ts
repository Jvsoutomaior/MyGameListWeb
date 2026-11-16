import { nextTick, reactive } from 'vue'

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
type Messages = Partial<Record<Exclude<keyof ValidityState, 'valid'>, string>>

export function useFormValidation(rules: Record<string, Messages>) {
  const errors = reactive<Partial<Record<string, string>>>({})

  function check(field: Control): void {
    const messages = rules[field.id]
    if (!messages || !field.willValidate) return

    const invalidRule = (Object.keys(messages) as (keyof Messages)[]).find(
      (rule) => field.validity[rule],
    )
    if (field.required && !field.value.trim()) {
      errors[field.id] = messages.valueMissing ?? 'Preencha este campo.'
    } else if (invalidRule) {
      errors[field.id] = messages[invalidRule] ?? field.validationMessage
    } else if (!field.validity.valid) {
      errors[field.id] = field.validationMessage
    } else {
      delete errors[field.id]
    }
  }

  function controls(form: HTMLFormElement): Control[] {
    return [...form.querySelectorAll<Control>('input[id], textarea[id], select[id]')].filter(
      (field) => Object.hasOwn(rules, field.id),
    )
  }

  function focusError(form: HTMLFormElement): void {
    void nextTick(() =>
      controls(form)
        .find((field) => errors[field.id])
        ?.focus(),
    )
  }

  function validate(form: HTMLFormElement): boolean {
    controls(form).forEach(check)
    if (!Object.keys(errors).length) return true
    focusError(form)
    return false
  }

  function fieldError(form: HTMLFormElement, id: string, message: string): void {
    errors[id] = message
    focusError(form)
  }

  function fieldAttrs(id: string) {
    return {
      'aria-invalid': errors[id] ? true : undefined,
      'aria-describedby': errors[id] ? `${id}-error` : undefined,
      onBlur: (event: FocusEvent) => {
        const field = event.currentTarget as Control
        if (!errors[id] && (field.value || field.validity.badInput)) check(field)
      },
      onInput: (event: Event) => {
        if (errors[id]) check(event.currentTarget as Control)
      },
    }
  }

  function clear(): void {
    Object.keys(errors).forEach((id) => delete errors[id])
  }

  return { errors, validate, fieldError, fieldAttrs, clear }
}
