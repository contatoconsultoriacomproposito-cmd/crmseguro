import { useCallback, useMemo, useState } from 'react'

import {
  automationMachine,
  createAutomationInitialState,
  canAutomationRespond,
  canHumanTakeOver,
  isAutomationRunning,
  isWaitingForHuman,
  isHumanAttendance,
  isAttendanceCompleted,
  type AutomationMachineEvent,
  type AutomationMachineState,
} from '../automation/engine/automationMachine'

interface UseConversationAutomationOptions {
  conversationId?: string
  contactName?: string
}

interface ConversationAutomationStore {
  [conversationId: string]: AutomationMachineState
}

function createConversationState() {
  const initialState = createAutomationInitialState()

  return automationMachine(initialState, {
    type: 'NEW_CONTACT',
  })
}

export function useConversationAutomation({
  conversationId,
  contactName,
}: UseConversationAutomationOptions) {
  const [states, setStates] =
    useState<ConversationAutomationStore>({})

  const state = useMemo(() => {
    if (!conversationId) {
      return null
    }

    return (
      states[conversationId] ??
      createConversationState()
    )
  }, [conversationId, states])

  const dispatch = useCallback(
    (event: AutomationMachineEvent) => {
      if (!conversationId) {
        return
      }

      setStates(currentStates => {
        const currentState =
          currentStates[conversationId] ??
          createConversationState()

        const nextState = automationMachine(
          currentState,
          event
        )

        return {
          ...currentStates,
          [conversationId]: nextState,
        }
      })
    },
    [conversationId]
  )

  const startPreQualification =
    useCallback(() => {
      dispatch({
        type: 'START_PRE_QUALIFICATION',
      })
    }, [dispatch])

  const attendNormally = useCallback(() => {
    dispatch({
      type: 'ATTEND_NORMALLY',
    })
  }, [dispatch])

  const takeOver = useCallback(() => {
    dispatch({
      type: 'TAKE_OVER',
    })
  }, [dispatch])

  const reset = useCallback(() => {
    if (!conversationId) {
      return
    }

    setStates(currentStates => ({
      ...currentStates,
      [conversationId]:
        createConversationState(),
    }))
  }, [conversationId])

  const advancePreQualification =
    useCallback(() => {
      dispatch({
        type: 'ADVANCE_PRE_QUALIFICATION',
      })
    }, [dispatch])

  const setName = useCallback(
    (value: string) => {
      dispatch({
        type: 'SET_NAME',
        value,
      })
    },
    [dispatch]
  )

  const setEmail = useCallback(
    (value: string) => {
      dispatch({
        type: 'SET_EMAIL',
        value,
      })
    },
    [dispatch]
  )

  const setProduct = useCallback(
    (value: string) => {
      dispatch({
        type: 'SET_PRODUCT',
        value,
      })
    },
    [dispatch]
  )

  const finishPreQualification =
    useCallback(() => {
      dispatch({
        type: 'FINISH_PRE_QUALIFICATION',
      })
    }, [dispatch])

  const startRouting = useCallback(() => {
    dispatch({
      type: 'START_ROUTING',
    })
  }, [dispatch])

  const setRoutingReason = useCallback(
    (value: string) => {
      dispatch({
        type: 'SET_ROUTING_REASON',
        value,
      })
    },
    [dispatch]
  )

  const finishRouting = useCallback(() => {
    dispatch({
      type: 'FINISH_ROUTING',
    })
  }, [dispatch])

  const completeAttendance =
    useCallback(() => {
      dispatch({
        type: 'COMPLETE_ATTENDANCE',
      })
    }, [dispatch])

  const disableAutomation =
    useCallback(() => {
      dispatch({
        type: 'AUTOMATION_DISABLED',
      })
    }, [dispatch])

  const simulatePreQualificationStep =
    useCallback(() => {
      if (!state) {
        return
      }

      if (
        state.status !== 'pre_qualification'
      ) {
        return
      }

      const nextStep =
        state.currentStep + 1

      if (state.currentStep === 1) {
        setName(
          contactName?.trim() ||
            'João'
        )
      }

      if (state.currentStep === 2) {
        setEmail('joao@email.com')
      }

      if (state.currentStep === 3) {
        setProduct('Seguro Auto')
      }

      if (
        state.currentStep >=
        state.totalSteps
      ) {
        finishPreQualification()
        return
      }

      if (
        nextStep <= state.totalSteps
      ) {
        advancePreQualification()
      }
    }, [
      state,
      contactName,
      setName,
      setEmail,
      setProduct,
      finishPreQualification,
      advancePreQualification,
    ])

  const simulateRouting =
    useCallback(() => {
      if (!conversationId) {
        return
      }

      setStates(currentStates => {
        const currentState =
          currentStates[conversationId] ??
          createConversationState()

        let nextState = currentState

        if (
          nextState.status ===
          'awaiting_decision'
        ) {
          nextState = automationMachine(
            nextState,
            {
              type: 'START_ROUTING',
            }
          )
        }

        if (
          nextState.status !== 'routing'
        ) {
          return currentStates
        }

        nextState = automationMachine(
          nextState,
          {
            type: 'SET_ROUTING_REASON',
            value: 'Sinistro',
          }
        )

        nextState = automationMachine(
          nextState,
          {
            type: 'FINISH_ROUTING',
          }
        )

        return {
          ...currentStates,
          [conversationId]: nextState,
        }
      })
    }, [conversationId])

  const flags = useMemo(() => {
    if (!state) {
      return {
        automationRunning: false,
        waitingForHuman: false,
        humanAttendance: false,
        attendanceCompleted: false,
        automationCanRespond: false,
        humanCanTakeOver: false,
      }
    }

    return {
      automationRunning:
        isAutomationRunning(state),

      waitingForHuman:
        isWaitingForHuman(state),

      humanAttendance:
        isHumanAttendance(state),

      attendanceCompleted:
        isAttendanceCompleted(state),

      automationCanRespond:
        canAutomationRespond(state),

      humanCanTakeOver:
        canHumanTakeOver(state),
    }
  }, [state])

  return {
    state,

    dispatch,

    startPreQualification,
    attendNormally,
    takeOver,
    reset,

    advancePreQualification,
    setName,
    setEmail,
    setProduct,
    finishPreQualification,

    startRouting,
    setRoutingReason,
    finishRouting,

    completeAttendance,
    disableAutomation,

    simulatePreQualificationStep,
    simulateRouting,

    ...flags,
  }
}