import { Component } from "react"
import type { ReactNode } from "react"

// A small version of react-error-boundary's <ErrorBoundary>, so playground
// code can import it the way real code would.

type FallbackProps = { error: Error; resetErrorBoundary: () => void }

type Props = {
  children?: ReactNode
  fallback?: ReactNode
  fallbackRender?: (props: FallbackProps) => ReactNode
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  resetErrorBoundary = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallbackRender) {
      return this.props.fallbackRender({
        error,
        resetErrorBoundary: this.resetErrorBoundary,
      })
    }
    return this.props.fallback ?? null
  }
}
