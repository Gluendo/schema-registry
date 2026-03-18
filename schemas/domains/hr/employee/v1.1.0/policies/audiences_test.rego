package gluendo.audiences.hr.employee_test

import rego.v1

import data.gluendo.audiences.hr.employee

# Internal audience sees all fields
test_internal_sees_everything if {
    result := employee.projected_data with input as {
        "audience": "internal",
        "data": {
            "employeeId": "EMP-001",
            "firstName": "Alice",
            "homeAddress": {"city": "Paris"},
            "contactInfo": {"email": "alice@example.com"},
            "managerId": "EMP-042",
            "costCenter": "CC-100"
        }
    }
    result.homeAddress
    result.contactInfo
    result.managerId
    result.costCenter
}

# Partner audience does not see PII or internal fields
test_partner_excludes_sensitive if {
    result := employee.projected_data with input as {
        "audience": "partner",
        "data": {
            "employeeId": "EMP-001",
            "firstName": "Alice",
            "lastName": "Martin",
            "department": "Engineering",
            "homeAddress": {"city": "Paris"},
            "contactInfo": {"email": "alice@example.com"},
            "managerId": "EMP-042",
            "costCenter": "CC-100"
        }
    }
    result.employeeId == "EMP-001"
    result.firstName == "Alice"
    result.department == "Engineering"
    not result.homeAddress
    not result.contactInfo
    not result.managerId
    not result.costCenter
}

# Unknown audience is denied
test_unknown_audience_denied if {
    msgs := employee.deny with input as {
        "audience": "public",
        "data": {"employeeId": "EMP-001"}
    }
    count(msgs) > 0
}
