# 三灵宠生产动作

采用art/concepts/hero-pets/design.png。内置image_gen生成source.png（完整prompt.txt），pack-pet-art.cjs只做裁格与基线注册，不重画素材。

三列物种、五行常态/眨眼/小跑A/小跑B/攻击，输出4×4/128格/512²真透明图集。最终资产/来源SHA256和裁格在manifest.json。资源通过远程pets Bundle按成长准备，源大图不打包。

纯模拟pets.ts、单Sprite PetView.ts、租约加载pet-art.ts；真实引擎验收在art/reviews/pets-v917。
