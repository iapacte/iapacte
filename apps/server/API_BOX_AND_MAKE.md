# Comprehensive API Methods of Box and Make

This README compiles a complete list of API endpoints for Box and Make based on official documentation, OpenAPI specs, and reference materials. Endpoints are grouped by resource categories, with HTTP methods, paths, and brief descriptions. Includes all known endpoints, including enterprise-specific ones (e.g., admin, compliance, collaborations for Box; orgs, roles for Make). For Box, derived from API reference and partial OpenAPI paths. For Make, based on resource-oriented structure from docs. Base URLs: Box (`https://api.box.com/2.0/`), Make (regional, e.g., `https://eu1.make.com/api/v2/`). Authentication: Box (OAuth 2.0), Make (API tokens with scopes). Use as inspiration for your API platform—focus on ReBAC for sharing, hierarchies for enterprises, and versioning.

## Box API Endpoints

Box has over 150 endpoints across resources. Groups based on tags/path prefixes. All versions (e.g., 2024.0+) supported via `box-version` header for enterprise updates.

### AI and Intelligence (Enterprise Content Analysis)

- POST `/ai/ask` – AI agent for question requests.
- POST `/ai/extract` – AI agent for structured extract request.
- POST `/ai/text_gen` – AI agent for text generation requests.
- GET `/ai/agents/{id}` – AI agent reference.
- GET `/ai/agents` – AI agents list.
- GET `/ai/extract/response` – AI extract response.
- GET `/ai/extract/structured/response` – AI extract structured response.
- GET `/ai/llm/endpoint/params/aws` – AI LLM endpoint params AWS.
- GET `/ai/llm/endpoint/params/google` – AI LLM endpoint params Google.
- GET `/ai/llm/endpoint/params/ibm` – AI LLM endpoint params IBM.
- GET `/ai/llm/endpoint/params/openai` – AI LLM endpoint params OpenAI.
- GET `/ai/response` – AI response.
- GET `/ai/response/full` – AI response (Full).

### Allowed Collaborations (Enterprise Domain Policies)

- GET `/collaboration_whitelist_entries` – List allowed collaboration domains.
- GET `/collaboration_whitelist_entries/{id}` – Get allowed collaboration domain.
- POST `/collaboration_whitelist_entries` – Add domain to list of allowed collaboration domains.
- DELETE `/collaboration_whitelist_entries/{id}` – Remove domain from list of allowed collaboration domains.
- GET `/collaboration_whitelist_exempt_targets` – List users exempt from collaboration domain restrictions.
- GET `/collaboration_whitelist_exempt_targets/{id}` – Get user exempt from collaboration domain restrictions.
- POST `/collaboration_whitelist_exempt_targets` – Create user exemption from collaboration domain restrictions.
- DELETE `/collaboration_whitelist_exempt_targets/{id}` – Remove user from list of users exempt from domain restrictions.

### App Items (Enterprise App Integrations)

- GET `/app_items` – List app items.
- GET `/app_items/{id}` – Get app item.
- POST `/app_items` – Create app item.
- DELETE `/app_items/{id}` – Delete app item.
- GET `/app_item_associations` – List app item associations.
- POST `/app_item_associations` – Create app item association.
- GET `/app_item/event/source` – AppItem event source.

### Archives (Enterprise Archiving)

- GET `/archives` – List archives.
- GET `/archives/{id}` – Get archive.
- POST `/archives` – Create archive.
- DELETE `/archives/{id}` – Delete archive.

### Authentication

- POST `/oauth2/token` – Get access token (enterprise SSO).
- POST `/oauth2/revoke` – Revoke token.

### Box Doc Gen (Enterprise Document Generation)

- GET `/doc-gen/jobs/{batch_id}` – Get Box Doc Gen jobs by batch ID.
- GET `/doc-gen/jobs/{job_id}` – Get Box Doc Gen job by ID (Base/Full).
- GET `/doc-gen/jobs` – List all Box Doc Gen jobs (Full).
- POST `/doc-gen/templates/{template_id}/generate` – Generate document using Box Doc Gen template.
- GET `/doc-gen/templates/tags` – List all Box Doc Gen template tags.
- GET `/doc-gen/templates/tags/processing/message` – Box Doc Gen tags processing message.
- GET `/doc-gen/templates/{template_id}` – Get Box Doc Gen template by ID.
- GET `/doc-gen/templates` – List Box Doc Gen templates.
- POST `/doc-gen/templates` – Create Box Doc Gen template.
- DELETE `/doc-gen/templates/{id}` – Delete Box Doc Gen template.
- GET `/doc-gen/templates/{id}/jobs` – Get list of all Box Doc Gen jobs for template.

### Collaborations (ReBAC Core for Enterprise Sharing)

- POST `/collaborations` – Create collaboration (invite with role).
- GET `/collaborations/{id}` – Get collaboration.
- PUT `/collaborations/{id}` – Update collaboration (role/status).
- DELETE `/collaborations/{id}` – Delete collaboration.
- GET `/files/{id}/collaborations` – List collaborations on file.
- GET `/folders/{id}/collaborations` – List collaborations on folder.

### Collections

- GET `/collections` – List all collections.
- GET `/collections/{id}` – Get collection by ID.
- GET `/collections/{id}/items` – List collection items.

### Comments

- GET `/comments` – List comments.
- POST `/comments` – Create comment.
- GET `/comments/{id}` – Get comment.
- PUT `/comments/{id}` – Update comment.
- DELETE `/comments/{id}` – Delete comment.
- GET `/files/{id}/comments` – List comments on file.

### Events (Enterprise Auditing)

- GET `/events` – List events (user/enterprise).
- GET `/events?stream_position=now` – Real-time events long-poll.

### Files

- GET `/files/{id}` – Get file info (Full/Mini).
- POST `/files/content` – Upload file.
- PUT `/files/{id}/content` – Update file content.
- DELETE `/files/{id}` – Delete file.
- GET `/files/{id}/content` – Download file.
- POST `/files/{id}/copy` – Copy file.
- GET `/files/{id}/versions` – List file versions (enterprise retention).
- POST `/files/{id}/versions` – Promote version.
- DELETE `/files/{id}/versions/{version_id}` – Delete version.
- GET `/files/{id}/trash` – Get trashed file.
- DELETE `/files/{id}/trash` – Permanently delete.
- POST `/files/{id}/upload_sessions` – Create upload session (chunked).
- PUT `/files/{id}/upload_sessions/{session_id}` – Upload part.
- GET `/files/{id}/upload_sessions/{session_id}` – Get session status.
- POST `/files/{id}/upload_sessions/{session_id}/commit` – Commit upload.

### Folders

- GET `/folders/{id}` – Get folder info (Full/Mini).
- POST `/folders` – Create folder.
- PUT `/folders/{id}` – Update folder.
- DELETE `/folders/{id}` – Delete folder.
- GET `/folders/{id}/items` – List folder items.
- POST `/folders/{id}/copy` – Copy folder.
- GET `/folders/trash/items` – List trashed folders.
- GET `/folders/{id}/trash` – Get trashed folder.
- DELETE `/folders/{id}/trash` – Permanently delete.
- POST `/folders/{id}/watermark` – Apply watermark.
- GET `/folders/{id}/watermark` – Get watermark.
- DELETE `/folders/{id}/watermark` – Remove watermark.

### Groups (Enterprise Teams)

- GET `/groups` – List groups.
- POST `/groups` – Create group.
- GET `/groups/{id}` – Get group.
- PUT `/groups/{id}` – Update group.
- DELETE `/groups/{id}` – Delete group.
- GET `/groups/{id}/memberships` – List group memberships.
- POST `/group_memberships` – Create group membership.
- GET `/group_memberships/{id}` – Get membership.
- PUT `/group_memberships/{id}` – Update membership.
- DELETE `/group_memberships/{id}` – Delete membership.
- GET `/groups/{id}/collaborations` – List group collaborations.

### Legal Holds (Enterprise Compliance)

- GET `/legal_hold_policies` – List legal hold policies.
- POST `/legal_hold_policies` – Create legal hold policy.
- GET `/legal_hold_policies/{id}` – Get policy.
- PUT `/legal_hold_policies/{id}` – Update policy.
- DELETE `/legal_hold_policies/{id}` – Delete policy.
- GET `/legal_hold_policy_assignments` – List assignments.
- POST `/legal_hold_policy_assignments` – Create assignment.
- GET `/legal_hold_policy_assignments/{id}` – Get assignment.
- DELETE `/legal_hold_policy_assignments/{id}` – Delete assignment.
- GET `/file_version_legal_holds/{id}` – Get file version under hold.

### Metadata

- GET `/metadata_templates` – List metadata templates.
- POST `/metadata_templates/schema` – Create metadata template.
- GET `/metadata_templates/{scope}/{template_key}/schema` – Get template schema.
- PUT `/metadata_templates/{scope}/{template_key}/schema` – Update template.
- DELETE `/metadata_templates/{scope}/{template_key}/schema` – Delete template.
- GET `/files/{id}/metadata/{scope}/{template_key}` – Get file metadata.
- POST `/files/{id}/metadata/{scope}/{template_key}` – Create file metadata.
- PUT `/files/{id}/metadata/{scope}/{template_key}` – Update file metadata.
- DELETE `/files/{id}/metadata/{scope}/{template_key}` – Delete file metadata.
- Similar for folders: `/folders/{id}/metadata/...`.

### Recent Items

- GET `/recent_items` – List recent items (enterprise tracking).

### Retention Policies (Enterprise Governance)

- GET `/retention_policies` – List retention policies.
- POST `/retention_policies` – Create retention policy.
- GET `/retention_policies/{id}` – Get policy.
- PUT `/retention_policies/{id}` – Update policy.
- GET `/retention_policy_assignments` – List assignments.
- POST `/retention_policy_assignments` – Create assignment.
- GET `/retention_policy_assignments/{id}` – Get assignment.
- DELETE `/retention_policy_assignments/{id}` – Delete assignment.

### Search

- GET `/search` – Search content (enterprise filters).

### Shared Links

- GET `/files/{id}#shared_link` – Get shared link.
- PUT `/files/{id}` – Update shared link (with fields).
- DELETE `/files/{id}#shared_link` – Remove shared link.
- Similar for folders/web_links.

### Sign Requests (Enterprise e-Signature)

- POST `/sign_requests` – Create sign request.
- GET `/sign_requests` – List sign requests.
- GET `/sign_requests/{id}` – Get sign request.
- POST `/sign_requests/{id}/resend` – Resend sign request.
- DELETE `/sign_requests/{id}` – Cancel sign request.

### Skills (Enterprise AI on Content)

- GET `/skills` – List skills.
- POST `/skills` – Create skill.
- GET `/skills/{id}` – Get skill.
- PUT `/skills/{id}` – Update skill.
- DELETE `/skills/{id}` – Delete skill.

### Storage Policies (Enterprise Data Residency)

- GET `/storage_policies` – List storage policies.
- GET `/storage_policies/{id}` – Get policy.
- GET `/storage_policy_assignments` – List assignments.
- POST `/storage_policy_assignments` – Create assignment.
- GET `/storage_policy_assignments/{id}` – Get assignment.
- PUT `/storage_policy_assignments/{id}` – Update assignment.
- DELETE `/storage_policy_assignments/{id}` – Delete assignment.

### Tasks

- POST `/tasks` – Create task.
- GET `/tasks/{id}` – Get task.
- PUT `/tasks/{id}` – Update task.
- DELETE `/tasks/{id}` – Delete task.
- GET `/files/{id}/tasks` – List tasks on file.
- POST `/task_assignments` – Create task assignment.
- GET `/task_assignments/{id}` – Get assignment.
- PUT `/task_assignments/{id}` – Update assignment.
- DELETE `/task_assignments/{id}` – Delete assignment.

### Terms of Service (Enterprise Acceptance)

- GET `/terms_of_services` – List terms.
- POST `/terms_of_services` – Create terms.
- GET `/terms_of_services/{id}` – Get terms.
- PUT `/terms_of_services/{id}` – Update terms.
- GET `/terms_of_service_user_statuses` – List user statuses.
- POST `/terms_of_service_user_statuses` – Create user status.
- GET `/terms_of_service_user_statuses/{id}` – Get user status.
- PUT `/terms_of_service_user_statuses/{id}` – Update user status.

### Users (Enterprise Admin)

- GET `/users` – List users.
- POST `/users` – Create user (managed/app).
- GET `/users/{id}` – Get user.
- PUT `/users/{id}` – Update user.
- DELETE `/users/{id}` – Delete user (transfer content).
- GET `/users/me` – Get current user.
- GET `/users/{id}/email_aliases` – List email aliases.
- POST `/users/{id}/email_aliases` – Create email alias.
- DELETE `/users/{id}/email_aliases/{alias_id}` – Delete alias.
- GET `/users/{id}/folders/0` – Get root folder for user.

### Web Links

- GET `/web_links/{id}` – Get web link.
- POST `/web_links` – Create web link.
- PUT `/web_links/{id}` – Update web link.
- DELETE `/web_links/{id}` – Delete web link.

### Webhooks

- GET `/webhooks` – List all webhooks.
- POST `/webhooks` – Create webhook.
- GET `/webhooks/{id}` – Get webhook.
- PUT `/webhooks/{id}` – Update webhook.
- DELETE `/webhooks/{id}` – Delete webhook.

### Workflows (Enterprise Automation)

- GET `/workflows` – List workflows.
- POST `/workflows/{id}/start` – Start workflow.

## Make API Endpoints

Make has over 300 endpoints, grouped by resources. Enterprise features include orgs, teams (via teamId), roles, audit. Paths often include query params like teamId, pg for pagination.

### Affiliate

- GET `/affiliates` – List affiliates (enterprise partners).
- GET `/affiliates/{id}` – Get affiliate.
- POST `/affiliates` – Create affiliate.

### Agents and AI Agents

- GET `/agents` – List agents.
- POST `/agents` – Create agent.
- GET `/ai-agents` – List AI agents.
- POST `/ai-agents` – Create AI agent.
- GET `/ai-agents/{id}` – Get AI agent.
- GET `/ai-agents/{id}/context` – Get AI agent context.
- GET `/ai-agents/llm/providers` – List LLM providers.

### Analytics and Consumptions

- GET `/analytics` – Get analytics (enterprise usage).
- GET `/scenarios/{id}/consumptions` – Get scenario consumptions.

### Audit Logs (Enterprise Compliance)

- GET `/audit-logs` – List audit logs (admin).

### Cashier (Enterprise Billing)

- GET `/cashier` – Get billing info.
- POST `/cashier` – Process payment.

### Connections

- GET `/connections` – List connections.
- POST `/connections` – Create connection.
- GET `/connections/{id}` – Get connection.
- PATCH `/connections/{id}` – Update connection.
- DELETE `/connections/{id}` – Delete connection.

### Custom Properties and Structures

- GET `/custom-properties` – List custom properties.
- POST `/custom-properties` – Create custom property.
- GET `/custom-properties/structure/items` – List structure items.
- GET `/scenarios/{id}/custom-properties/data` – Get scenario custom properties data.

### Data Stores

- GET `/data-stores` – List data stores (with teamId).
- POST `/data-stores` – Create data store.
- GET `/data-stores/{id}` – Get data store.
- PATCH `/data-stores/{id}` – Update data store.
- DELETE `/data-stores/{id}` – Delete data store.
- GET `/data-stores/{id}/data` – List data in store.
- POST `/data-stores/{id}/data` – Add data record.
- PUT `/data-stores/{id}/data/{key}` – Update record.
- DELETE `/data-stores/{id}/data/{key}` – Delete record.

### Data Structures

- GET `/data-structures` – List data structures.
- POST `/data-structures` – Create data structure.
- GET `/data-structures/{id}` – Get data structure.
- PATCH `/data-structures/{id}` – Update data structure.
- DELETE `/data-structures/{id}` – Delete data structure.

### Devices

- GET `/devices` – List devices (enterprise IoT).
- POST `/devices` – Create device.
- GET `/devices/{id}` – Get device.
- PATCH `/devices/{id}` – Update device.
- DELETE `/devices/{id}` – Delete device.
- GET `/devices/incomings` – List incoming data.
- GET `/devices/outgoing` – List outgoing data.

### Enums and Custom Functions

- GET `/enums` – List enums.
- GET `/custom-functions` – List custom functions.
- POST `/custom-functions` – Create custom function.

### General

- GET `/general/version` – Get API version.
- GET `/general/status` – Get platform status.

### Hooks

- GET `/hooks` – List hooks.
- POST `/hooks` – Create hook.
- GET `/hooks/{id}` – Get hook.
- PATCH `/hooks/{id}` – Update hook.
- DELETE `/hooks/{id}` – Delete hook.
- GET `/hooks/incomings` – List incoming hooks.
- GET `/hooks/{id}/logs` – Get hook logs.

### Incomplete Executions

- GET `/incomplete-executions` – List incomplete executions.
- POST `/incomplete-executions/{id}/resolve` – Resolve execution.

### Keys

- GET `/keys` – List keys (crypto/secure).
- POST `/keys` – Create key.
- GET `/keys/{id}` – Get key.
- DELETE `/keys/{id}` – Delete key.

### Notifications

- GET `/notifications` – List notifications.
- POST `/notifications` – Create notification.
- GET `/notifications/{id}` – Get notification.

### Organizations (Enterprise Hierarchies)

- GET `/organizations` – List organizations.
- POST `/organizations` – Create organization.
- GET `/organizations/{id}` – Get organization.
- PATCH `/organizations/{id}` – Update organization.
- DELETE `/organizations/{id}` – Delete organization.
- GET `/organizations/{id}/user-roles` – List user roles (RBAC).
- POST `/organizations/{id}/user-roles` – Assign user role.
- GET `/organizations/{id}/user-roles/{roleId}` – Get role.
- PATCH `/organizations/{id}/user-roles/{roleId}` – Update role.
- DELETE `/organizations/{id}/user-roles/{roleId}` – Delete role.
- POST `/organizations/{id}/invites` – Invite to organization.
- GET `/organizations/invites` – List invites.

### Remote Procedures

- GET `/remote-procedures` – List remote procedures.
- POST `/remote-procedures` – Create remote procedure.
- GET `/remote-procedures/{id}` – Get remote procedure.

### Scenarios (Core Automation Workflows)

- GET `/scenarios` – List scenarios (filter by teamId, folderId).
- POST `/scenarios` – Create scenario (with blueprint, scheduling).
- GET `/scenarios/{id}` – Get scenario.
- PATCH `/scenarios/{id}` – Update scenario.
- DELETE `/scenarios/{id}` – Delete scenario.
- POST `/scenarios/{id}/clone` – Clone scenario (with mappings).
- POST `/scenarios/{id}/start` – Activate scenario.
- POST `/scenarios/{id}/stop` – Deactivate scenario.
- POST `/scenarios/{id}/run` – Run scenario (with data, callback).
- GET `/scenarios/{id}/interface` – Get interface (inputs/outputs).
- PATCH `/scenarios/{id}/interface` – Update interface.
- GET `/scenarios/{id}/build-variables` – Get buildtime variables.
- POST `/scenarios/{id}/build-variables` – Add buildtime variables.
- PUT `/scenarios/{id}/build-variables` – Update buildtime variables.
- DELETE `/scenarios/{id}/build-variables` – Delete buildtime variable.
- GET `/scenarios/{id}/logs` – Get scenario logs.
- GET `/scenarios/{id}/blueprints` – Get blueprint.
- GET `/scenarios/{id}/usage` – Get usage/consumptions.
- GET `/scenarios/{id}/tools` – Get tools.
- GET `/scenarios/{id}/triggers` – Get triggers.
- GET `/scenarios/{id}/data/{moduleId}` – Check module data.

### Scenarios Folders

- GET `/scenarios-folders` – List folders.
- POST `/scenarios-folders` – Create folder.
- GET `/scenarios-folders/{id}` – Get folder.
- PATCH `/scenarios-folders/{id}` – Update folder.
- DELETE `/scenarios-folders/{id}` – Delete folder.

### SDK Apps (Enterprise Custom Apps)

- GET `/sdk-apps` – List SDK apps.
- POST `/sdk-apps` – Create SDK app.
- GET `/sdk-apps/{id}` – Get SDK app.
- PATCH `/sdk-apps/{id}` – Update SDK app.
- DELETE `/sdk-apps/{id}` – Delete SDK app.
- GET `/sdk-apps/{id}/modules` – List modules.
- POST `/sdk-apps/{id}/invites` – Invite to SDK app.
- GET `/sdk-apps/{id}/invites` – List invites.

### Users

- GET `/users/api-tokens` – List API tokens.
- POST `/users/api-tokens` – Create API token.
- DELETE `/users/api-tokens/{id}` – Delete token.
- GET `/users` – List users (org context).
- GET `/users/{id}` – Get user.

This list aims for completeness based on available sources; verify with latest docs for updates. In your platform, add pagination, filtering, and error codes for usability.
