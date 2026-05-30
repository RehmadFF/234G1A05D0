# Campus Notification Platform - System Design

## Stage 1: API Design & Architecture

### 1. Core Actions Supported
The notification platform is engineered to support the following core business actions:
*   **Fetch Notifications:** Retrieve a historical list of notifications targeted to a specific student context.
*   **Mark Notification as Read:** Update the status of a specific notification to prevent redundant alerts.
*   **Real-Time Broadcast/Stream:** Establish an active persistent channel to push notifications instantly as they occur.

### 2. REST API Contracts

#### A. Get All Notifications
*   **Endpoint:** `GET /api/v1/notifications`
*   **Description:** Retrieves all notifications for the authenticated session context.
*   **Headers:**
```json
    {
      "Authorization": "Bearer <access_token>",
      "Content-Type": "application/json"
    }
    ```
*   **Query Parameters:**
    *   `studentId` (string, required): Unique identifier of the student.
    *   `status` (string, optional): Filter by `read`, `unread`, or `all`.
*   **Success Response (Status 200 OK):**
```json
    {
      "success": true,
      "data": [
        {
          "id": "43460952-0086-434a-bb59-398014576be",
          "type": "Result",
          "message": "Semester 4 results have been published.",
          "timestamp": "2026-04-22T17:51:30Z",
          "isRead": false
        }
      ]
    }
    ```

#### B. Mark Notification as Read
*   **Endpoint:** `PATCH /api/v1/notifications/:id/read`
*   **Description:** Updates the read status of an individual notification item.
*   **Headers:**
```json
    {
      "Authorization": "Bearer <access_token>",
      "Content-Type": "application/json"
    }
    ```
*   **Success Response (Status 200 OK):**
```json
    {
      "success": true,
      "message": "Notification marked as read successfully.",
      "updatedId": "43460952-0086-434a-bb59-398014576be"
    }
    ```

---

### 3. Real-Time Notification Mechanism

To support immediate, low-overhead delivery of updates (Placements, Events, Results) while users are actively using the application, we select **Server-Sent Events (SSE)** over WebSockets or Polling.

#### Architecture Justification:
1.  **Unidirectional Flow:** Notifications only stream from the server to the client. SSE is natively unidirectional, removing the unnecessary upstream overhead of WebSockets.
2.  **Native Browser Support:** Implemented via the standard HTML5 `EventSource` API, bypassing the need for complex, heavy external libraries like Socket.io.
3.  **Automatic Reconnection:** Handles client disconnects automatically with built-in retry logic.

#### SSE Endpoint Contract:
*   **Endpoint:** `GET /api/v1/notifications/stream`
*   **Headers Required:**
```http
    Content-Type: text/event-stream
    Cache-Control: no-cache
    Connection: keep-alive
    ```