package gluendo.audiences.hr.employee

import rego.v1

# Audience projection policy for the Employee entity.
# Defines which fields are visible to each audience.
# See ADR-009 for the policy-as-code approach.

# Sensitive fields excluded from non-internal audiences
pii_fields := {"homeAddress", "contactInfo", "terminationDate"}

partner_excluded := pii_fields | {"managerId", "costCenter"}

# Compute the projected payload for a given audience
projected_data := result if {
    input.audience == "internal"
    result := input.data
}

projected_data := result if {
    input.audience == "partner"
    result := {k: v |
        some k, v in input.data
        not k in partner_excluded
    }
}

# Reject unknown audiences
deny contains msg if {
    not input.audience in {"internal", "partner"}
    msg := sprintf("unknown audience: %s", [input.audience])
}
