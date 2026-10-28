import { teamService } from './teamService';

export const userService = {
  getTeam: async () => {
    try {
      const [usersData, seatsData] = await Promise.allSettled([
        teamService.getUsers(),
        teamService.getSeats()
      ]);

      const usersList = usersData.status === 'fulfilled' ? usersData.value.users : [];
      const seats = seatsData.status === 'fulfilled' ? seatsData.value : null;

      return {
        seats: {
          used: seats?.used ?? usersList.length,
          limit: seats?.limit ?? seats?.max ?? 10,
          invited: seats?.invited ?? 0
        },
        members: usersList
      };
    } catch (err) {
      console.warn('Backend team fetch notice:', err?.message);
      return {
        seats: { used: 0, limit: 10, invited: 0 },
        members: []
      };
    }
  },

  inviteMember: async (memberData) => {
    return teamService.inviteUser({
      name: memberData.name || `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim(),
      email: memberData.email,
      role: memberData.role || 'MEMBER',
      mobile: memberData.mobile,
      designation: memberData.designation
    });
  },

  removeMember: async (userId, reason) => {
    return teamService.removeUser(userId, reason);
  }
};

export default userService;
