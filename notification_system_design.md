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

  ## Stage 4: Performance Optimization & Caching

### Problem Analysis
Fetching notifications directly from the primary database on every single page load for 50,000+ students creates an unsustainable number of read operations (I/O bottlenecks) and database connection overhead. To solve this, we must shift the load away from the primary database using caching and optimized client-server communication.

### Proposed Solutions & Trade-offs

#### 1. Implementation of a Distributed Cache (Redis)
**Strategy:** Introduce an in-memory data store like Redis between the backend API and the MongoDB database. When a student requests their notifications, the API first checks Redis. If a cached version exists, it returns immediately (cache hit). If not, it queries MongoDB, returns the data, and stores a copy in Redis (cache miss).
* **Trade-offs:**
    * *Pros:* Blazing fast sub-millisecond read times. Drastically reduces the CPU and I/O load on the primary MongoDB database.
    * *Cons:* Increases infrastructure complexity and cost. Requires strict **Cache Invalidation** logic (the cache must be updated or purged the exact moment a student reads a notification or a new one is broadcasted, otherwise they will see stale data).

#### 2. Client-Side State Management & SSE (Single-Fetch Paradigm)
**Strategy:** The current issue stems from a poor frontend architectural pattern (fetching on *every* page load). Instead, the frontend (e.g., React context or Redux) should fetch the initial notification payload exactly *once* upon the user's first login session. From there, it relies entirely on the **Server-Sent Events (SSE)** channel we designed in Stage 1 to receive new notifications in real-time and append them to the local client state.
* **Trade-offs:**
    * *Pros:* Eliminates 99% of API GET requests. Reduces server costs significantly.
    * *Cons:* Requires the frontend team to build more complex state management and robust auto-reconnect logic for dropped SSE connections. Increased memory usage on the user's browser.

#### 3. Cursor-Based Pagination
**Strategy:** Instead of returning a massive payload of a student's entire notification history, the API should only return the top 15 most recent notifications. If the user wants to see older alerts, they click a "Load More" button which fetches the next batch using a cursor (e.g., the `_id` of the last notification).
* **Trade-offs:**
    * *Pros:* Keeps network payload sizes extremely small. Reduces memory usage on both the server and the client.
    * *Cons:* Introduces slight UX friction, as users cannot infinitely scroll without triggering a new network request. Requires slightly more complex backend querying logic.

## Stage 5: Reliability & Message Queues

### 1. Shortcomings of the Current Implementation
The provided pseudocode has critical architectural flaws for a system at scale:
* **Synchronous Blocking:** Iterating through 50,000 users synchronously blocks the main execution thread. In single-threaded environments like Node.js, this will crash the server or freeze it for other requests.
* **Lack of Fault Tolerance:** Since there is no `try/catch` or error boundary, when the `send_email` API call fails for the 200th student, the entire loop crashes. The remaining 49,800 students will never receive their DB update, email, or in-app push notification.
* **No Retry Mechanism:** Transient network errors with a third-party email provider (like SendGrid or AWS SES) will permanently drop the notification without a way to retry the failed delivery.

### 2. Redesigning for Reliability and Speed
To make this process robust and lightning-fast, we must move from a **Synchronous Loop** to an **Asynchronous Event-Driven Architecture using Message Queues** (such as RabbitMQ, Kafka, or BullMQ). 

Instead of doing the heavy lifting immediately, the API should quickly accept the request, perform a bulk database insert, and then offload the slow email/push tasks to background worker queues.

### 3. Decoupling DB Saves and Email Dispatches
**Should they happen together?** Absolutely not. 
* **Database inserts** are internal, highly predictable, and extremely fast (especially if batched).
* **Sending emails** relies on external third-party network calls, which are inherently slow, unpredictable, and subject to rate limits. 
Tying them together tightly means an external network failure compromises internal data integrity. They must be decoupled.

### 4. Revised Pseudocode

```javascript
// --- PRODUCER (Main API Handler) ---
function notify_all(student_ids: array, message: string):
    // 1. Perform a single BULK insert to the DB for all 50k users (Extremely fast)
    bulk_save_to_db(student_ids, message)
    
    // 2. Offload external tasks to background message queues
    for student_id in student_ids:
        // Push payload to queues instead of executing immediately
        email_queue.add_job({ student_id, message })
        push_notification_queue.add_job({ student_id, message })
        
    return "Notifications are processing in the background"

// --- CONSUMER WORKERS (Running independently in the background) ---

// Worker for processing emails with automatic retries
function process_email_queue(job):
    try:
        send_email(job.student_id, job.message)
    catch (error):
        log_error(error)
        job.retry(max_attempts = 3, backoff = exponential)

// Worker for processing in-app real-time pushes
function process_push_notification_queue(job):
    try:
        push_to_app(job.student_id, job.message)
    catch (error):
        log_error(error)
        job.retry(max_attempts = 3, backoff = exponential)