import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import {
  AdminRecipesService,
  CreateRecipeCollectionDto,
  CreateRecipeDto,
} from '../services/admin-recipes.service';

@Controller('admin/recipes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRecipesController {
  constructor(private adminRecipesService: AdminRecipesService) {}

  @Get('collections')
  async getCollections() {
    return this.adminRecipesService.getCollections();
  }

  @Get('collections/:id')
  async getCollection(@Param('id') id: string) {
    return this.adminRecipesService.getCollection(id);
  }

  @Post('collections')
  async createCollection(@Body() data: CreateRecipeCollectionDto) {
    return this.adminRecipesService.createCollection(data);
  }

  @Put('collections/:id')
  async updateCollection(
    @Param('id') id: string,
    @Body() data: Partial<CreateRecipeCollectionDto>,
  ) {
    return this.adminRecipesService.updateCollection(id, data);
  }

  @Delete('collections/:id')
  async deleteCollection(@Param('id') id: string) {
    return this.adminRecipesService.deleteCollection(id);
  }

  @Post('collections/:collectionId/recipes')
  async createRecipe(
    @Param('collectionId') collectionId: string,
    @Body() data: CreateRecipeDto,
  ) {
    return this.adminRecipesService.createRecipe(collectionId, data);
  }

  @Put('recipes/:id')
  async updateRecipe(@Param('id') id: string, @Body() data: Partial<CreateRecipeDto>) {
    return this.adminRecipesService.updateRecipe(id, data);
  }

  @Delete('recipes/:id')
  async deleteRecipe(@Param('id') id: string) {
    return this.adminRecipesService.deleteRecipe(id);
  }

  @Put('collections/:collectionId/reorder')
  async reorderRecipes(
    @Param('collectionId') collectionId: string,
    @Body() body: { recipeIds: string[] },
  ) {
    return this.adminRecipesService.reorderRecipes(collectionId, body.recipeIds);
  }
}
