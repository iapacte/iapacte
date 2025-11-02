### MVP API Documentation

This API is designed for enterprise use by regional and local governments, emphasizing workflows for automation scenarios, with supporting files, folders, and ReBAC permissions via OpenFGA. It draws inspiration from:

- **Box**: For robust file and folder handling (e.g., CRUD, collaborations for sharing), permissions model (role-based access with external flexibility), and content associations.
- **Make**: For core workflow automation (e.g., scenarios as blueprints with triggers/actions, cloning, running, and logs), plus organization into folders for better hierarchy.

All endpoints are under `/api/v1/`. Authentication uses OAuth 2.0/JWT. Authorization enforces ReBAC relations (e.g., "owner", "editor", "executor", "external_viewer") via middleware. Pagination uses query params like `limit` and `offset`. Errors follow standard HTTP codes with JSON details.

#### Organizations

Manage enterprise hierarchies for governments.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations` | List accessible organizations (ReBAC-filtered; includes shared ones). |
| POST | `/organizations` | Create organization (e.g., name, region; auto-assign creator as owner). |
| GET | `/organizations/{orgId}` | Get organization details. |
| PATCH | `/organizations/{orgId}` | Update organization (e.g., metadata like continent). |
| DELETE | `/organizations/{orgId}` | Delete organization (if no active resources; cascade revokes). |

#### Users & Roles

Handle users within and across orgs (for sharing).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations/{orgId}/users` | List users in organization (includes external collaborators). |
| POST | `/organizations/{orgId}/users` | Add/invite user (with initial ReBAC relation, e.g., "member"; supports external email). |
| GET | `/organizations/{orgId}/users/{userId}` | Get user details. |
| PATCH | `/organizations/{orgId}/users/{userId}` | Update user or role/relation. |
| DELETE | `/organizations/{orgId}/users/{userId}` | Remove user (revoke all relations). |

#### (For future) Workflow Folders

Organize workflows into folders for hierarchy (inspired by Make's scenarios folders).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations/{orgId}/workflow-folders` | List workflow folders (paginated). |
| POST | `/organizations/{orgId}/workflow-folders` | Create workflow folder. |
| GET | `/organizations/{orgId}/workflow-folders/{folderId}` | Get workflow folder details (incl. contained workflows). |
| PATCH | `/organizations/{orgId}/workflow-folders/{folderId}` | Update workflow folder. |
| DELETE | `/organizations/{orgId}/workflow-folders/{folderId}` | Delete workflow folder (if empty). |

#### Workflows

Core automation for government scenarios (e.g., approval flows); shareable cross-org and organizable in folders.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations/{orgId}/workflows` | List workflows (filter by status or folderId; includes shared). |
| POST | `/organizations/{orgId}/workflows` | Create workflow (JSON blueprint with triggers/actions/schedule; optional folderId). |
| GET | `/organizations/{orgId}/workflows/{workflowId}` | Get workflow details (incl. blueprint). |
| PATCH | `/organizations/{orgId}/workflows/{workflowId}` | Update workflow (e.g., blueprint, schedule, or move to folder). |
| DELETE | `/organizations/{orgId}/workflows/{workflowId}` | Delete workflow (if inactive). |
| POST | `/organizations/{orgId}/workflows/{workflowId}/clone` | Clone workflow (for reuse or sharing templates). |
| POST | `/organizations/{orgId}/workflows/{workflowId}/start` | Activate workflow (enable triggers). |
| POST | `/organizations/{orgId}/workflows/{workflowId}/stop` | Deactivate workflow. |
| POST | `/organizations/{orgId}/workflows/{workflowId}/run` | Manually run workflow (with input payload; async job ID). |
| GET | `/organizations/{orgId}/workflows/{workflowId}/logs` | Get execution logs (paginated; for compliance auditing). |
| POST | `/organizations/{orgId}/workflows/{workflowId}/external-run` | Run workflow from external org (if collaboration allows). |
| GET | `/organizations/{orgId}/workflows/{workflowId}/interface` | Get workflow interface (inputs/outputs schema for integrations). |
| PATCH | `/organizations/{orgId}/workflows/{workflowId}/interface` | Update workflow interface (e.g., adjust parameters). |

#### (For future) Folders & Files

Supporting content for workflows (e.g., documents in approvals); shareable cross-org.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/organizations/{orgId}/folders` | Create folder (optional workflow association). |
| GET | `/organizations/{orgId}/folders/{folderId}` | Get folder details (incl. items list). |
| POST | `/organizations/{orgId}/folders/{folderId}/files` | Upload file (triggers associated workflows; basic metadata). |
| GET | `/organizations/{orgId}/files/{fileId}` | Get file info/metadata. |
| GET | `/organizations/{orgId}/files/{fileId}/content` | Download file content (streamed). |
| DELETE | `/organizations/{orgId}/files/{fileId}` | Delete file (triggers cleanup workflows if set). |

#### Permissions/Collaborations

Unified ReBAC for internal/external sharing (Box-flexible model).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/organizations/{orgId}/collaborations` | Create collaboration (resource: workflow/file/folder/workflow-folder; accessible_by: internal/external user/email/ID; role: e.g., "external_editor"). |
| GET | `/organizations/{orgId}/{resourceType}/{resourceId}/collaborations` | List collaborations on resource (incl. external; paginated). |
| PATCH | `/organizations/{orgId}/collaborations/{collabId}` | Update collaboration (e.g., change role). |
| DELETE | `/organizations/{orgId}/collaborations/{collabId}` | Revoke collaboration. |
| POST | `/organizations/{orgId}/exemptions` | Create user exemption for external access (bypasses restrictions). |
| GET | `/organizations/{orgId}/exemptions` | List exemptions (paginated). |
