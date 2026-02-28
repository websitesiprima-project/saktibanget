'use client'
import styled from 'styled-components'

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 1rem;
`

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.p`
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
`

interface LoadingSpinnerProps {
    text?: string
    size?: 'small' | 'medium' | 'large'
}

export default function LoadingSpinner({ text = 'Memuat data...', size = 'medium' }: LoadingSpinnerProps) {
    const sizes = {
        small: '24px',
        medium: '48px',
        large: '72px'
    }

    return (
        <LoadingContainer>
            <Spinner style={{ width: sizes[size], height: sizes[size] }} />
            {text && <LoadingText>{text}</LoadingText>}
        </LoadingContainer>
    )
}
