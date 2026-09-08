'use client'

import { FormEvent, useState } from 'react'

interface FieldError {
  field: string
  message: string
}

export default function ConsultationForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    // Save formElement synchronously BEFORE any await (React 18 event lifecycle safety)
    const formElement = event.currentTarget
    setState('sending')
    setMessage('')
    setFieldErrors({})

    try {
      const formData = new FormData(formElement)
      const payload = Object.fromEntries(formData.entries())

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          consent: formData.get('consent') === 'on',
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setState('error')

        if (response.status === 422 && data?.error?.fields) {
          const errorsMap: Record<string, string> = {}
          data.error.fields.forEach((err: FieldError) => {
            errorsMap[err.field] = err.message
          })
          setFieldErrors(errorsMap)
          setMessage('Vui lòng kiểm tra lại các trường thông tin bên dưới.')
        } else if (response.status === 429) {
          setMessage('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.')
        } else {
          setMessage(data?.error?.message || 'Chưa thể lưu hồ sơ. Vui lòng thử lại sau.')
        }
        return
      }

      setState('success')
      const leadId = data?.data?.leadId ? ` (${data.data.leadId})` : ''
      setMessage(`Đã ghi nhận hồ sơ${leadId}. Mộc Việt sẽ liên hệ theo kênh bạn đã cung cấp trong vòng 24 giờ làm việc.`)
      formElement.reset()
    } catch (error) {
      setState('error')
      setMessage('Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền và thử lại.')
    } finally {
      // Ensure sending state is never permanently stuck
      setState((prev) => (prev === 'sending' ? 'idle' : prev))
    }
  }

  return (
    <form className="form-shell" onSubmit={submit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Họ và tên</label>
          <input
            id="name"
            name="name"
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          />
          {fieldErrors.name && (
            <span id="name-error" className="field-error-text" role="alert">
              {fieldErrors.name}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="contact">Email hoặc số điện thoại di động</label>
          <input
            id="contact"
            name="contact"
            type="text"
            placeholder="email@vidu.com hoặc 0912345678"
            required
            aria-invalid={Boolean(fieldErrors.contact)}
            aria-describedby={fieldErrors.contact ? 'contact-error' : undefined}
          />
          {fieldErrors.contact && (
            <span id="contact-error" className="field-error-text" role="alert">
              {fieldErrors.contact}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="branch">Nhánh đào tạo quan tâm</label>
          <select id="branch" name="branch" defaultValue="chua_biet">
            <option value="chua_biet">Chưa biết, cần tư vấn định hướng</option>
            <option value="cot_song">Tác động cột sống (A1 - A3)</option>
            <option value="yoga">Yoga Mộc Việt (B1 - B3)</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="preferredFormat">Hình thức học mong muốn</label>
          <input
            id="preferredFormat"
            name="preferredFormat"
            placeholder="Ví dụ: Online tự học, Trực tiếp tại Hà Nội, Kết hợp..."
          />
        </div>

        <div className="field field-full">
          <label htmlFor="experience">Kinh nghiệm hoặc chuyên môn hiện tại</label>
          <input
            id="experience"
            name="experience"
            placeholder="Ví dụ: Chưa từng học, Huấn luyện viên, Kỹ thuật viên trị liệu..."
          />
        </div>

        <div className="field field-full">
          <label htmlFor="goal">Mục tiêu học tập & câu hỏi của bạn</label>
          <textarea
            id="goal"
            name="goal"
            required
            minLength={10}
            placeholder="Chia sẻ nguyện vọng học để trị liệu cho bản thân, gia đình hay đào tạo nghề..."
            aria-invalid={Boolean(fieldErrors.goal)}
            aria-describedby={fieldErrors.goal ? 'goal-error' : undefined}
          />
          {fieldErrors.goal && (
            <span id="goal-error" className="field-error-text" role="alert">
              {fieldErrors.goal}
            </span>
          )}
        </div>

        <div className="field field-full">
          <label className="checkbox-label">
            <input type="checkbox" name="consent" required />
            <span>Tôi đồng ý để Mộc Việt sử dụng thông tin này phục vụ cho việc tư vấn lộ trình học tập.</span>
          </label>
          {fieldErrors.consent && (
            <span className="field-error-text" role="alert">
              {fieldErrors.consent}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <button
          type="submit"
          className="button button-dark"
          disabled={state === 'sending'}
        >
          {state === 'sending' ? 'Đang gửi thông tin...' : 'Gửi nhu cầu học'}
        </button>
      </div>

      {message && (
        <div
          className={`status-note ${state === 'error' ? 'status-error' : 'status-success'}`}
          role="status"
          style={{ marginTop: '1.25rem' }}
        >
          {message}
        </div>
      )}
    </form>
  )
}