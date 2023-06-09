import type { User } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";

const filterUserForClient = (user:User) => {
    return {
        id: user.id,
        username: user.username,
        profileImageUrl: user.profileImageUrl,
    }

}


export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany(
        {
            take:100,
            orderBy: [{createdAt: "desc"}]

        }
    );
    const users = (
        await clerkClient.users.getUserList({
        userId: posts.map((post) => post.userId),
        limit: 100,
    })

    ).map(filterUserForClient);

         return posts.map(post=>
            {

            const user = users.find((user) => user.id === post.userId);
            if (!user || !user.username ) 
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR", 
                message: "User for post not found"
            });

            return {
                post,
                user:{
                    ...user,
                    username: user.username,
                }
            }
            }
            )
    

  }),

  create: privateProcedure
  .input(
    z.object({
        content: z.string(),
  })
  )
  .mutation(async({ctx, input})=>{
    const userId = ctx.userId;
    const post = await ctx.prisma.post.create({
        data:{
            userId,
            content: input.content,
        }
  });
  return post;
}),

})
