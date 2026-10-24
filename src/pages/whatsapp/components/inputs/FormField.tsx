import {
  forwardRef,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react'

type Primitive =
  | string
  | number
  | null
  | undefined

interface FormFieldProps<T = string>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange'
  > {
  label?: string
  value?: Primitive
  onChange: (value: T) => void
  formatter?: (
    value: Primitive
  ) => string
  parser?: (
    value: string
  ) => T
  error?: string
  helperText?: string
  required?: boolean
}

const FormField = forwardRef<
  HTMLInputElement,
  FormFieldProps<any>
>(
  (
    {
      label,
      value,
      onChange,
      formatter,
      parser,
      error,
      helperText,
      required,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const displayValue = formatter
      ? formatter(value)
      : String(value ?? '')

    const handleChange = (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const inputValue =
        event.target.value

      const finalValue = parser
        ? parser(inputValue)
        : inputValue

      onChange(finalValue)
    }

    return (
      <div className="min-w-0">
        {label && (
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {label}

            {required && (
              <span className="ml-1 text-rose-500">
                *
              </span>
            )}
          </label>
        )}

        <input
          ref={ref}
          {...props}
          value={displayValue}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          className={`
            h-9 w-full rounded-lg border bg-white px-3 text-sm
            text-slate-700 outline-none transition
            placeholder:text-slate-400
            disabled:cursor-not-allowed
            disabled:bg-slate-100
            disabled:text-slate-500
            ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
            }
            ${className}
          `}
        />

        {error ? (
          <p className="mt-1 text-[11px] font-medium text-rose-500">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

FormField.displayName = 'FormField'

export default FormField