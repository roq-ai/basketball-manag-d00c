import type { NextApiRequest, NextApiResponse } from 'next';
import { roqClient } from 'server/roq';
import { prisma } from 'server/db';
import { errorHandlerMiddleware } from 'server/middlewares';
import { sportsTeamValidationSchema } from 'validationSchema/sports-teams';
import { HttpMethod, convertMethodToOperation, convertQueryToPrismaUtil } from 'server/utils';
import { getServerSession } from '@roq/nextjs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roqUserId, user } = await getServerSession(req);
  await prisma.sports_team
    .withAuthorization({
      roqUserId,
      tenantId: user.tenantId,
      roles: user.roles,
    })
    .hasAccess(req.query.id as string, convertMethodToOperation(req.method as HttpMethod));

  switch (req.method) {
    case 'GET':
      return getSportsTeamById();
    case 'PUT':
      return updateSportsTeamById();
    case 'DELETE':
      return deleteSportsTeamById();
    default:
      return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  async function getSportsTeamById() {
    const data = await prisma.sports_team.findFirst(convertQueryToPrismaUtil(req.query, 'sports_team'));
    return res.status(200).json(data);
  }

  async function updateSportsTeamById() {
    await sportsTeamValidationSchema.validate(req.body);
    const data = await prisma.sports_team.update({
      where: { id: req.query.id as string },
      data: {
        ...req.body,
      },
    });
    if (req.body.name) {
      await roqClient.asUser(roqUserId).updateTenant({ id: user.tenantId, tenant: { name: req.body.name } });
    }
    return res.status(200).json(data);
  }
  async function deleteSportsTeamById() {
    const data = await prisma.sports_team.delete({
      where: { id: req.query.id as string },
    });
    return res.status(200).json(data);
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  return errorHandlerMiddleware(handler)(req, res);
}
