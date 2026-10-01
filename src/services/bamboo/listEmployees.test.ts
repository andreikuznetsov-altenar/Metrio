import { describe, expect, it } from 'vitest';
import { isFieldRestricted, parseListEmployeesPage } from './listEmployees';

describe('parseListEmployeesPage', () => {
  it('parses real List Employees data[] shape with meta and restricted fields', () => {
    const page = parseListEmployeesPage({
      data: [
        {
          employeeId: '101',
          workEmail: 'alice@co.com',
          supervisorEId: '1',
          jobTitle: 'Designer',
          firstName: 'Alice',
          lastName: 'Smith',
          status: 'Active',
          _restrictedFields: [],
        },
        {
          employeeId: '102',
          firstName: 'Bob',
          lastName: 'Lee',
          status: 'Active',
          _restrictedFields: ['supervisorEId'],
        },
      ],
      meta: { nextPageUrl: 'https://api.bamboohr.com/api/gateway.php/acme/v1/employees?cursor=abc' },
      _links: { next: { href: 'https://api.bamboohr.com/api/gateway.php/acme/v1/employees?cursor=abc' } },
    });

    expect(page.employees).toHaveLength(2);
    expect(page.employees[0].id).toBe('101');
    expect(page.employees[0].workEmail).toBe('alice@co.com');
    expect(page.restrictedFieldsByEmployee['102']).toContain('supervisorEId');
    expect(page.nextPagePath).toContain('cursor=abc');
  });

  it('detects globally restricted supervisor field', () => {
    const employees = [
      { id: '1', workEmail: 'a@co.com', _restrictedFields: ['supervisorEId'] },
      { id: '2', workEmail: 'b@co.com', _restrictedFields: ['supervisorEId'] },
    ];
    expect(isFieldRestricted({ '1': ['supervisorEId'], '2': ['supervisorEId'] }, employees, 'supervisorEId')).toBe(true);
  });
});
