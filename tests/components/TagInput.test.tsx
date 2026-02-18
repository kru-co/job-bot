import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from '@/components/TagInput'

function setup(tags: string[] = [], onChange = vi.fn()) {
  const utils = render(
    <TagInput tags={tags} onChange={onChange} placeholder="Add a skill…" />
  )
  // When tags are present the placeholder is suppressed — use role to find the input reliably
  const input = screen.getByRole('textbox')
  return { ...utils, input, onChange }
}

describe('TagInput', () => {
  describe('rendering', () => {
    it('renders existing tags', () => {
      render(<TagInput tags={['React', 'TypeScript']} onChange={vi.fn()} />)
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })

    it('shows placeholder when no tags exist', () => {
      render(<TagInput tags={[]} onChange={vi.fn()} placeholder="Add skills…" />)
      expect(screen.getByPlaceholderText('Add skills…')).toBeInTheDocument()
    })

    it('hides placeholder when tags are present', () => {
      render(<TagInput tags={['React']} onChange={vi.fn()} placeholder="Add skills…" />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('placeholder', 'Add skills…')
    })

    it('renders a remove button for each tag', () => {
      render(<TagInput tags={['React', 'TypeScript']} onChange={vi.fn()} />)
      const removeButtons = screen.getAllByRole('button')
      expect(removeButtons).toHaveLength(2)
    })
  })

  describe('adding tags', () => {
    it('calls onChange with new tag when Enter is pressed', async () => {
      const { input, onChange } = setup()
      await userEvent.type(input, 'Roadmapping{Enter}')
      expect(onChange).toHaveBeenCalledWith(['Roadmapping'])
    })

    it('clears the input after adding a tag', async () => {
      const { input } = setup()
      await userEvent.type(input, 'Roadmapping{Enter}')
      expect(input).toHaveValue('')
    })

    it('adds a tag on blur', async () => {
      const onChange = vi.fn()
      const { input } = setup([], onChange)
      await userEvent.type(input, 'Analytics')
      fireEvent.blur(input)
      expect(onChange).toHaveBeenCalledWith(['Analytics'])
    })

    it('trims whitespace before adding', async () => {
      const { input, onChange } = setup()
      await userEvent.type(input, '  SQL  {Enter}')
      expect(onChange).toHaveBeenCalledWith(['SQL'])
    })

    it('does not add an empty tag', async () => {
      const { input, onChange } = setup()
      await userEvent.type(input, '   {Enter}')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not add a duplicate tag', async () => {
      const { input, onChange } = setup(['React'])
      await userEvent.type(input, 'React{Enter}')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('appends to existing tags', async () => {
      const { input, onChange } = setup(['React'])
      await userEvent.type(input, 'Vue{Enter}')
      expect(onChange).toHaveBeenCalledWith(['React', 'Vue'])
    })
  })

  describe('removing tags', () => {
    it('removes a tag when its × button is clicked', async () => {
      const onChange = vi.fn()
      render(<TagInput tags={['React', 'TypeScript']} onChange={onChange} />)
      const removeButtons = screen.getAllByRole('button')
      await userEvent.click(removeButtons[0]) // Remove 'React'
      expect(onChange).toHaveBeenCalledWith(['TypeScript'])
    })

    it('removes the last tag when Backspace is pressed on empty input', async () => {
      const { input, onChange } = setup(['React', 'Vue'])
      await userEvent.click(input)
      await userEvent.keyboard('{Backspace}')
      expect(onChange).toHaveBeenCalledWith(['React'])
    })

    it('does not call onChange on Backspace when input has text', async () => {
      const { input, onChange } = setup(['React'])
      await userEvent.type(input, 'Ty')
      await userEvent.keyboard('{Backspace}') // deletes 'y', not a tag
      expect(onChange).not.toHaveBeenCalled()
    })
  })
})
