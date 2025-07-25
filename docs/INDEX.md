# 项目文档中心

欢迎来到 `gemini-balance-nextjs` 项目的文档中心。为了方便团队成员查找和管理项目相关的各类文档，我们对 `docs` 目录进行了结构化整理。

## 文档结构说明

所有文档都根据其在项目生命周期中的作用，被归类到以下文件夹中。文件夹名称前的数字代表了其在时间线和逻辑上的顺序。

- **`1_Proposals_and_Specs/` - 提案与规格**

  - 存放项目最初的构想、目标、功能规格和迁移方案。这些是定义“我们要做什么”的文档。

- **`2_Assessments_and_Reviews/` - 评估与审查**

  - 存放所有对项目代码、架构和迁移过程的评估、对比分析和审查报告。这些是“我们做得怎么样”的文档。

- **`3_Development_Plans/` - 开发计划**

  - 存放根据评估结果制定的、具体的、分阶段的开发蓝图和路线图。这些是“我们下一步要怎么做”的文档。

- **`4_Implementation_Details/` - 实现细节**

  - 存放为具体开发任务而做的技术调研、对标分析和实现方案。这些是“某个功能具体要如何实现”的文档。

- **`5_Task_Lists/` - 任务清单**

  - 存放可执行的、用于跟踪进度的任务清单（TODO List）。这些是“我们需要完成哪些具体任务”的文档。

- **`0_Archive/` - 历史归档**
  - 存放所有已过时、被取代或仅作历史参考的旧文档。当一份新文档取代了旧文档时（例如，新的开发计划取代了旧的），应将旧文档移至此目录。

## 文档管理建议

为了保持文档库的清晰和有效，我们建议遵循以下原则：

1.  **文件名即摘要**:

    - 文件名应清晰地概括其内容，并包含日期（`YYYYMMDD` 格式）或版本号。
    - **推荐**: `PROJECT_ASSESSMENT_20250714_ZH.md`
    - **不推荐**: `assessment.md`

2.  **先分类，再创建**:

    - 在添加新文档时，首先思考它属于哪个类别，并将其放入对应的文件夹中。

3.  **及时归档**:

    - 当一份新文档的内容被新的文档完全覆盖或替代时，请勇敢地将旧文档移动到 `0_Archive/` 目录。这能确保团队成员总能找到最新的信息。

4.  **更新日期和版本**:
    - 在对重要文档（如开发计划）进行重大更新时，建议直接创建一个带有新日期的副本进行修改，并将旧文件归档。这保留了清晰的版本历史。

希望这个新的结构能帮助我们更高效地协作！
