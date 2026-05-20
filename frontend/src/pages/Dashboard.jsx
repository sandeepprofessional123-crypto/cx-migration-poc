import React, { useEffect, useState } from "react"
import axios from "axios"
import { BACKEND_BASE_URL, clearSession } from "../session"

export default function Dashboard() {

  const [user, setUser] = useState(null)
  const [userId, setUserId] = useState("")
  const [loginType, setLoginType] = useState("")

  useEffect(() => {

    const storedUserId = localStorage.getItem("userId")
    const storedLoginType = localStorage.getItem("loginType")

    setUserId(storedUserId)
    setLoginType(storedLoginType)

    if (!storedUserId) {
      window.location.href = "/"
      return
    }

    axios.get(`${BACKEND_BASE_URL}/user/${storedUserId}`)
      .then(res => {
        setUser(res.data.user)
      })

  }, [])

  const logout = async () => {

    clearSession()

    try {
      const { msalInstance } = await import("../azureConfig")
      await msalInstance.logoutRedirect()
    } catch (e) { }

    try {
      const oktaAuth = (await import("../oktaConfig")).default
      await oktaAuth.signOut()
    } catch (e) { }

    window.location.href = "/"
  }

  const deregister = async () => {
    if (!userId) return

    await axios.post(`${BACKEND_BASE_URL}/user/deregister`, {
      userId,
      actor: user?.email || "self-service",
      reason: "User initiated de-registration"
    })

    alert("User de-registered")
    await logout()
  }

  return (

    <div style={{ padding: "40px" }}>

      <h2>Welcome to CX Migration Engine</h2>

      {user && (

        <div>

          <h3>
            Welcome {user.firstName} {user.lastName}
          </h3>

          <p>Company: {user.company}</p>
          <p>Login Type: {loginType}</p>
          <p>Status: {user.isDeleted ? "De-registered" : "Active"}</p>

          <button onClick={logout}>
            Logout
          </button>

          <button onClick={deregister} style={{ marginLeft: "12px" }}>
            De-register
          </button>

        </div>

      )}

    </div>

  )

}
