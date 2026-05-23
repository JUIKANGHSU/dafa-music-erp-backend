import { useState, useEffect } from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = {
    id: string
    title?: string
    description?: string
    action?: React.ReactNode
    variant?: "default" | "destructive"
}

let count = 0

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
}

type Toastt = {
    id: string
    title?: string
    description?: string
    variant?: "default" | "destructive"
}

const listeners: Array<(state: Toastt[]) => void> = []

let memoryState: Toastt[] = []

function dispatch(action: { type: "ADD_TOAST"; toast: Toastt } | { type: "DISMISS_TOAST"; toastId?: string }) {
    switch (action.type) {
        case "ADD_TOAST":
            memoryState = [{ ...action.toast }, ...memoryState].slice(0, TOAST_LIMIT)
            break
        case "DISMISS_TOAST":
            if (action.toastId) {
                memoryState = memoryState.filter((t) => t.id !== action.toastId)
            } else {
                memoryState = []
            }
            break
    }
    listeners.forEach((listener) => {
        listener(memoryState)
    })
}

function toast({ ...props }: Omit<Toastt, "id">) {
    const id = genId()

    const update = (props: ToasterToast) =>
        dispatch({
            type: "ADD_TOAST",
            toast: { ...props, id },
        })

    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
        },
    })

    return {
        id: id,
        dismiss,
        update,
    }
}

function useToast() {
    const [state, setState] = useState<Toastt[]>(memoryState)

    useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [state])

    return {
        toast,
        dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
        toasts: state,
    }
}

export { useToast, toast }
