import { formatDay, type DateKey, type Task } from '../../data'

export interface DeleteCopy {
  title: string
  message: string
  /** The red button. */
  confirm: string
}

/**
 * The words on the Delete menu. A routine is deleted "from today on" (past days stay); a
 * one-off is deleted as a block; an inbox to-do is just removed. If anything was logged the
 * menu says that the log stays in history.
 */
export function deleteCopy(task: Task, loggedCount: number, today: DateKey): DeleteCopy {
  const title = `Delete “${task.title}”?`

  if (task.repeat.kind !== 'once') {
    return {
      title,
      message:
        `It stops from today (${formatDay(today, today)}) on. Past days stay as they are.` +
        (loggedCount > 0 ? ' Days you already logged stay in your history.' : ''),
      confirm: 'Delete from today on',
    }
  }

  if (task.startTime === null) {
    return { title, message: 'This to-do will be removed from your Inbox.', confirm: 'Delete to-do' }
  }

  return {
    title,
    message:
      loggedCount > 0
        ? 'This block has a log. The log stays in your history.'
        : 'This block will be removed from your plan.',
    confirm: 'Delete block',
  }
}
