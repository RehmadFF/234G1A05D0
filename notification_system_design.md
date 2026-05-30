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

## Stage 2: Database Design & Persistence

### 1. Database Selection & Justification
For the notification microservice, I suggest using **MongoDB (NoSQL)**. 
* **Justification:** Notification systems are write-heavy and demand high throughput. MongoDB is good at rapid, high-volume write operations. Furthermore, the document-based model provides schema flexibility, which is highly beneficial if notification payloads (Events, Results, Placements) require custom metadata fields in the future without needing expensive database migrations.

### 2. Database Schema (NoSQL Document Structure)
We will maintain a `Notifications` collection. 

```json
// Collection: Notifications
{
  "_id": "ObjectId",
  "studentId": "String (Indexed)",
  "type": "String (Enum: 'Event', 'Result', 'Placement')",
  "message": "String",
  "isRead": "Boolean (Default: false)",
  "createdAt": "ISODate",
  "metadata": "Object (Optional)"
}

## Stage 3: Query Optimization & Indexing

### 1. Analysis of the Existing Query
**The Original Query:**
`SELECT * FROM notifications WHERE student_id = 1042 AND isRead = false ORDER BY createdAt DESC;`

**Is it accurate and why is it slow?**
The query is functionally accurate and will return the correct logical results. However, it is painfully slow because it forces a **Full Table Scan**. With 5,000,000 rows, the database engine must inspect every single row to check if the conditions match. Additionally, using `SELECT *` fetches all columns (including potentially large text payloads), wasting memory and network bandwidth. Finally, sorting (`ORDER BY`) an unindexed dataset of this size requires expensive in-memory operations or temporary disk files.

**What to change and the expected computation cost:**
1.  **Add a Composite Index:** I would create a composite B-Tree index specifically aligned with the query execution plan: `CREATE INDEX idx_student_unread ON notifications (student_id, isRead, createdAt DESC);`
2.  **Select Specific Columns:** Replace `SELECT *` with strictly required columns, e.g., `SELECT id, message, type, createdAt`.

*Computation Cost:* With the composite index, the database avoids the table scan entirely. The time complexity drops from O(N) to **O(log N)**. The database engine jumps directly to the target student's unread nodes and returns them pre-sorted, making the query execution virtually instantaneous.

### 2. Evaluating "Index Every Column" Advice
The suggestion to index every column to "be safe" is **highly ineffective and considered an anti-pattern**. 
* **Severe Write Penalty:** Every time a new notification is inserted, updated, or deleted, *every single index* must also be recalculated and updated. In a high-throughput notification system, this will cripple database write performance and cause locks.
* **Storage Overhead:** Indexes consume significant disk space and RAM. Indexing low-cardinality columns (like booleans) or unsearched text columns wastes expensive resources for zero performance gain.

### 3. Query: Placements in the Last 7 Days
To find all unique students who received a placement notification in the last 7 days, the optimized SQL query is:

```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL 7 DAY;