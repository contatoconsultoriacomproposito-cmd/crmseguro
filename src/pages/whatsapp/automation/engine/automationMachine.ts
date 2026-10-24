export type AutomationMachineStatus =
  | 'idle'
  | 'awaiting_decision'
  | 'pre_qualification'
  | 'routing'
  | 'awaiting_human'
  | 'human'
  | 'completed'

export type AutomationMachineType =
  | 'pre_qualification'
  | 'routing'
  | null

export type AutomationStopReason =
  | 'human_takeover'
  | 'attend_normally'
  | 'automation_disabled'
  | 'completed'
  | null

export interface AutomationQualificationData {
  name?: string
  email?: string
  product?: string
}

export interface AutomationRoutingData {
  reason?: string
}

export interface AutomationMachineState {
  status: AutomationMachineStatus
  type: AutomationMachineType

  sessionId?: string

  currentStep: number
  totalSteps: number

  qualificationData: AutomationQualificationData
  routingData: AutomationRoutingData

  startedAt?: string
  updatedAt?: string
  completedAt?: string

  humanTakeover: boolean
  stopReason: AutomationStopReason
}

export type AutomationMachineEvent =
  | {
      type: 'NEW_CONTACT'
    }
  | {
      type: 'NEW_SESSION'
    }
  | {
      type: 'START_PRE_QUALIFICATION'
    }
  | {
      type: 'START_ROUTING'
    }
  | {
      type: 'ADVANCE_PRE_QUALIFICATION'
    }
  | {
      type: 'SET_NAME'
      value: string
    }
  | {
      type: 'SET_EMAIL'
      value: string
    }
  | {
      type: 'SET_PRODUCT'
      value: string
    }
  | {
      type: 'SET_ROUTING_REASON'
      value: string
    }
  | {
      type: 'FINISH_PRE_QUALIFICATION'
    }
  | {
      type: 'FINISH_ROUTING'
    }
  | {
      type: 'TAKE_OVER'
    }
  | {
      type: 'ATTEND_NORMALLY'
    }
  | {
      type: 'AUTOMATION_DISABLED'
    }
  | {
      type: 'COMPLETE_ATTENDANCE'
    }
  | {
      type: 'RESET'
    }

export interface CreateAutomationStateOptions {
  sessionId?: string
  totalPreQualificationSteps?: number
}

const DEFAULT_PRE_QUALIFICATION_STEPS = 4

function now() {
  return new Date().toISOString()
}

export function createAutomationInitialState(
  options: CreateAutomationStateOptions = {}
): AutomationMachineState {
  const timestamp = now()

  return {
    status: 'idle',
    type: null,

    sessionId: options.sessionId,

    currentStep: 0,
    totalSteps:
      options.totalPreQualificationSteps ??
      DEFAULT_PRE_QUALIFICATION_STEPS,

    qualificationData: {},
    routingData: {},

    updatedAt: timestamp,

    humanTakeover: false,
    stopReason: null,
  }
}

export function automationMachine(
  state: AutomationMachineState,
  event: AutomationMachineEvent
): AutomationMachineState {
  switch (event.type) {
    case 'NEW_CONTACT':
      return startNewContact(state)

    case 'NEW_SESSION':
      return startNewSession(state)

    case 'START_PRE_QUALIFICATION':
      return startPreQualification(state)

    case 'START_ROUTING':
      return startRouting(state)

    case 'ADVANCE_PRE_QUALIFICATION':
      return advancePreQualification(state)

    case 'SET_NAME':
      return setQualificationName(
        state,
        event.value
      )

    case 'SET_EMAIL':
      return setQualificationEmail(
        state,
        event.value
      )

    case 'SET_PRODUCT':
      return setQualificationProduct(
        state,
        event.value
      )

    case 'SET_ROUTING_REASON':
      return setRoutingReason(
        state,
        event.value
      )

    case 'FINISH_PRE_QUALIFICATION':
      return finishPreQualification(state)

    case 'FINISH_ROUTING':
      return finishRouting(state)

    case 'TAKE_OVER':
      return takeOver(state)

    case 'ATTEND_NORMALLY':
      return attendNormally(state)

    case 'AUTOMATION_DISABLED':
      return disableAutomation(state)

    case 'COMPLETE_ATTENDANCE':
      return completeAttendance(state)

    case 'RESET':
      return createAutomationInitialState({
        sessionId: state.sessionId,
        totalPreQualificationSteps:
          state.totalSteps,
      })

    default:
      return state
  }
}

function startNewContact(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'idle' &&
    state.status !== 'completed'
  ) {
    return state
  }

  const timestamp = now()

  return {
    ...createAutomationInitialState({
      sessionId: state.sessionId,
      totalPreQualificationSteps:
        state.totalSteps,
    }),

    status: 'awaiting_decision',

    startedAt: timestamp,
    updatedAt: timestamp,
  }
}

function startNewSession(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'idle' &&
    state.status !== 'completed' &&
    state.status !== 'human'
  ) {
    return state
  }

  const timestamp = now()

  return {
    ...createAutomationInitialState({
      sessionId: state.sessionId,
      totalPreQualificationSteps:
        state.totalSteps,
    }),

    status: 'routing',
    type: 'routing',

    startedAt: timestamp,
    updatedAt: timestamp,
  }
}

function startPreQualification(
  state: AutomationMachineState
): AutomationMachineState {
  if (state.status !== 'awaiting_decision') {
    return state
  }

  return {
    ...state,

    status: 'pre_qualification',
    type: 'pre_qualification',

    currentStep: 1,

    humanTakeover: false,
    stopReason: null,

    updatedAt: now(),
  }
}

function startRouting(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'idle' &&
    state.status !== 'awaiting_decision'
  ) {
    return state
  }

  return {
    ...state,

    status: 'routing',
    type: 'routing',

    currentStep: 1,

    humanTakeover: false,
    stopReason: null,

    startedAt:
      state.startedAt ?? now(),

    updatedAt: now(),
  }
}

function advancePreQualification(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'pre_qualification' ||
    state.type !== 'pre_qualification'
  ) {
    return state
  }

  if (state.currentStep >= state.totalSteps) {
    return finishPreQualification(state)
  }

  return {
    ...state,

    currentStep: state.currentStep + 1,

    updatedAt: now(),
  }
}

function setQualificationName(
  state: AutomationMachineState,
  value: string
): AutomationMachineState {
  if (
    state.status !== 'pre_qualification' ||
    state.type !== 'pre_qualification'
  ) {
    return state
  }

  return {
    ...state,

    qualificationData: {
      ...state.qualificationData,
      name: value.trim(),
    },

    updatedAt: now(),
  }
}

function setQualificationEmail(
  state: AutomationMachineState,
  value: string
): AutomationMachineState {
  if (
    state.status !== 'pre_qualification' ||
    state.type !== 'pre_qualification'
  ) {
    return state
  }

  return {
    ...state,

    qualificationData: {
      ...state.qualificationData,
      email: value.trim(),
    },

    updatedAt: now(),
  }
}

function setQualificationProduct(
  state: AutomationMachineState,
  value: string
): AutomationMachineState {
  if (
    state.status !== 'pre_qualification' ||
    state.type !== 'pre_qualification'
  ) {
    return state
  }

  return {
    ...state,

    qualificationData: {
      ...state.qualificationData,
      product: value.trim(),
    },

    updatedAt: now(),
  }
}

function setRoutingReason(
  state: AutomationMachineState,
  value: string
): AutomationMachineState {
  if (
    state.status !== 'routing' ||
    state.type !== 'routing'
  ) {
    return state
  }

  return {
    ...state,

    routingData: {
      ...state.routingData,
      reason: value.trim(),
    },

    updatedAt: now(),
  }
}

function finishPreQualification(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'pre_qualification' ||
    state.type !== 'pre_qualification'
  ) {
    return state
  }

  return {
    ...state,

    status: 'awaiting_human',

    currentStep: state.totalSteps,

    updatedAt: now(),
  }
}

function finishRouting(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'routing' ||
    state.type !== 'routing'
  ) {
    return state
  }

  return {
    ...state,

    status: 'awaiting_human',

    updatedAt: now(),
  }
}

function takeOver(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status === 'idle' ||
    state.status === 'completed' ||
    state.status === 'human'
  ) {
    return state
  }

  return {
    ...state,

    status: 'human',

    humanTakeover: true,
    stopReason: 'human_takeover',

    updatedAt: now(),
  }
}

function attendNormally(
  state: AutomationMachineState
): AutomationMachineState {
  if (state.status !== 'awaiting_decision') {
    return state
  }

  return {
    ...state,

    status: 'human',

    humanTakeover: true,
    stopReason: 'attend_normally',

    updatedAt: now(),
  }
}

function disableAutomation(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'awaiting_decision' &&
    state.status !== 'pre_qualification' &&
    state.status !== 'routing' &&
    state.status !== 'awaiting_human'
  ) {
    return state
  }

  return {
    ...state,

    status: 'human',

    humanTakeover: false,
    stopReason: 'automation_disabled',

    updatedAt: now(),
  }
}

function completeAttendance(
  state: AutomationMachineState
): AutomationMachineState {
  if (
    state.status !== 'human' &&
    state.status !== 'awaiting_human'
  ) {
    return state
  }

  const timestamp = now()

  return {
    ...state,

    status: 'completed',

    completedAt: timestamp,
    updatedAt: timestamp,

    stopReason:
      state.stopReason ?? 'completed',
  }
}

export function canStartPreQualification(
  state: AutomationMachineState
) {
  return state.status === 'awaiting_decision'
}

export function canStartRouting(
  state: AutomationMachineState
) {
  return (
    state.status === 'idle' ||
    state.status === 'awaiting_decision'
  )
}

export function canAutomationRespond(
  state: AutomationMachineState
) {
  return (
    !state.humanTakeover &&
    (
      state.status === 'pre_qualification' ||
      state.status === 'routing'
    )
  )
}

export function canHumanTakeOver(
  state: AutomationMachineState
) {
  return (
    state.status === 'awaiting_decision' ||
    state.status === 'pre_qualification' ||
    state.status === 'routing' ||
    state.status === 'awaiting_human'
  )
}

export function isAutomationRunning(
  state: AutomationMachineState
) {
  return (
    state.status === 'pre_qualification' ||
    state.status === 'routing'
  )
}

export function isWaitingForHuman(
  state: AutomationMachineState
) {
  return state.status === 'awaiting_human'
}

export function isHumanAttendance(
  state: AutomationMachineState
) {
  return state.status === 'human'
}

export function isAttendanceCompleted(
  state: AutomationMachineState
) {
  return state.status === 'completed'
}