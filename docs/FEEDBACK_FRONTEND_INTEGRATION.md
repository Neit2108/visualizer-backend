# Feedback API - Frontend Integration Guide

## Overview

This guide shows how to integrate the Feedback API into your frontend application. The Feedback API is a RESTful endpoint that collects user feedback about the SQL Visualization tool.

## Basic Setup

### 1. Create a Feedback Service

Create a file to handle API communication:

```typescript
// src/services/feedbackService.ts
interface FeedbackPayload {
  sessionId?: string;
  email: string;
  rating: number; // 1-5
  category: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
}

interface FeedbackResponse {
  id: number;
  email: string;
  rating: number;
  category: string;
  message: string;
  createdAt: string;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const feedbackService = {
  // Submit feedback
  async submitFeedback(feedback: FeedbackPayload): Promise<FeedbackResponse> {
    const response = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to submit feedback');
    }

    const data = await response.json();
    return data.data;
  },

  // Get all feedback (admin)
  async getAllFeedback(limit: number = 10, offset: number = 0) {
    const response = await fetch(
      `${API_BASE}/feedback?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch feedback');
    }

    const data = await response.json();
    return data.data;
  },

  // Get statistics
  async getStatistics() {
    const response = await fetch(`${API_BASE}/feedback/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    const data = await response.json();
    return data.data;
  },

  // Get feedback by session
  async getSessionFeedback(sessionId: string) {
    const response = await fetch(`${API_BASE}/feedback/session/${sessionId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch session feedback');
    }

    const data = await response.json();
    return data.data;
  },
};
```

### 2. Create a Feedback Modal Component

```typescript
// src/components/FeedbackModal.tsx
import React, { useState } from 'react';
import { feedbackService } from '../services/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  sessionId,
}) => {
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<'bug' | 'feature' | 'improvement' | 'other'>('feature');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await feedbackService.submitFeedback({
        sessionId,
        email,
        rating,
        category,
        message,
      });

      setSuccess(true);
      setEmail('');
      setRating(5);
      setCategory('feature');
      setMessage('');

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Send Us Your Feedback</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {success ? (
          <div className="success-message">
            ✓ Thank you! Your feedback has been received.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="rating">Rating *</label>
              <div className="rating-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star ${rating >= star ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                    title={`${star} star${star !== 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                required
              >
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="improvement">Improvement Suggestion</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">Your Feedback *</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={10}
                maxLength={5000}
                placeholder="Please share your thoughts... (10-5000 characters)"
                rows={6}
              />
              <small>{message.length}/5000 characters</small>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
```

### 3. Create a Feedback Button

```typescript
// src/components/FeedbackButton.tsx
import React, { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackButtonProps {
  sessionId?: string;
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  sessionId,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`feedback-button ${className}`}
        title="Send us your feedback"
      >
        💬 Feedback
      </button>
      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sessionId={sessionId}
      />
    </>
  );
};
```

### 4. Use in Your App

```typescript
// src/App.tsx
import { FeedbackButton } from './components/FeedbackButton';

function App() {
  const sessionId = localStorage.getItem('sessionId');

  return (
    <div className="app">
      <header>
        <h1>SQL Visualization Tool</h1>
        <FeedbackButton sessionId={sessionId} />
      </header>
      {/* Rest of your app */}
    </div>
  );
}
```

## Styling Example (CSS)

```css
/* Feedback Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

.form-group {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
}

.rating-selector {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.star {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #ddd;
  padding: 0;
  transition: color 0.2s;
}

.star.filled {
  color: #ffc107;
}

.star:hover {
  color: #ffc107;
}

.error-message {
  color: #d32f2f;
  padding: 12px;
  background: #ffebee;
  border-radius: 4px;
  margin-top: 10px;
}

.success-message {
  color: #388e3c;
  padding: 16px 20px;
  background: #e8f5e9;
  border-radius: 4px;
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #eee;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feedback-button {
  padding: 8px 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.feedback-button:hover {
  background: #1565c0;
}
```

## Using with React Query (Optional)

```typescript
// src/hooks/useFeedback.ts
import { useMutation } from '@tanstack/react-query';
import { feedbackService } from '../services/feedbackService';

export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: (feedback) => feedbackService.submitFeedback(feedback),
    onError: (error) => {
      console.error('Feedback submission error:', error);
    },
  });
};

// Usage in component
const FeedbackModal = () => {
  const { mutate: submitFeedback, isPending } = useSubmitFeedback();

  const handleSubmit = (data) => {
    submitFeedback(data, {
      onSuccess: () => {
        // Handle success
      },
    });
  };
};
```

## Using with Vue.js

```typescript
// src/composables/useFeedback.ts
import { ref } from 'vue';
import { feedbackService } from '../services/feedbackService';

export const useFeedback = () => {
  const loading = ref(false);
  const error = ref('');
  const success = ref(false);

  const submitFeedback = async (feedback) => {
    loading.value = true;
    error.value = '';
    success.value = false;

    try {
      await feedbackService.submitFeedback(feedback);
      success.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit';
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    success,
    submitFeedback,
  };
};
```

## Error Handling

Always handle API errors gracefully:

```typescript
try {
  const response = await feedbackService.submitFeedback(feedback);
  console.log('Feedback submitted:', response);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('email')) {
      // Handle email validation error
    } else if (error.message.includes('rating')) {
      // Handle rating error
    } else {
      // Handle other errors
    }
  }
}
```

## Best Practices

1. **Always validate client-side** - Prevent invalid submissions before sending
2. **Use TypeScript** - Leverage type safety for feedback data
3. **Handle loading states** - Disable submit button during submission
4. **Show success feedback** - Confirm to user that feedback was received
5. **Include sessionId** - Track feedback to specific user sessions
6. **Graceful error handling** - Display user-friendly error messages
7. **Throttle submissions** - Prevent duplicate submissions
8. **Clear form after success** - Reset inputs after successful submission

## Environment Variables

In your `.env.local` or `.env` file:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

Or if deploying to production:

```env
REACT_APP_API_URL=https://api.example.com
```

## Testing

```typescript
// __tests__/feedbackService.test.ts
import { feedbackService } from '../services/feedbackService';

describe('feedbackService', () => {
  it('should submit feedback', async () => {
    const response = await feedbackService.submitFeedback({
      email: 'test@example.com',
      rating: 5,
      category: 'feature',
      message: 'Great tool!',
    });

    expect(response).toHaveProperty('id');
    expect(response.email).toBe('test@example.com');
  });
});
```

## Support

For more information:
- See `FEEDBACK_API.md` for complete API documentation
- Check Swagger UI at http://localhost:3000/api-docs
- See `FEEDBACK_QUICKSTART.md` for backend setup
