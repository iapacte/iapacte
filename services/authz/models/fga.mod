# Documentation at https://openfga.dev/docs/modeling/
# Examples at https://github.com/openfga/sample-stores

########################################################
# General Check: A user {user} can perform action {action} to/on/in {object types} ... if {conditions}
#
# OpenGFA ReBAC Check: Does user {user} have relation {relation} with object {object}?
########################################################

# Modular model manifest. Load order doesn’t matter; relations are fully qualified.
# Box ref: per-resource collaborations (file/folder/workflow).
# Make ref: workflows (scenarios) live inside folders; team-like inheritance can be modeled via parents.

schema: '1.2'
contents:
  - core.fga
  - organizations.fga
  - groups.fga
  - content.fga
  - workflows.fga
