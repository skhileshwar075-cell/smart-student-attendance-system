package com.smartattend.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.SchoolClass

class AdminClassesAdapter(
    private val onEdit: (SchoolClass) -> Unit,
    private val onDelete: (SchoolClass) -> Unit
) : ListAdapter<SchoolClass, AdminClassesAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvSection: TextView = view.findViewById(R.id.tvSection)
        val tvYear: TextView = view.findViewById(R.id.tvYear)
        val tvStudentCount: TextView = view.findViewById(R.id.tvStudentCount)
        val btnEdit: ImageButton = view.findViewById(R.id.btnEdit)
        val btnDelete: ImageButton = view.findViewById(R.id.btnDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_class, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvName.text = item.name
        holder.tvSection.text = item.section ?: ""
        holder.tvYear.text = listOfNotNull(
            item.academicYear,
            item.semester?.let { "Sem $it" }
        ).joinToString(" • ")
        holder.tvStudentCount.text = "${item.studentCount ?: 0} students"
        holder.btnEdit.setOnClickListener { onEdit(item) }
        holder.btnDelete.setOnClickListener { onDelete(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<SchoolClass>() {
            override fun areItemsTheSame(a: SchoolClass, b: SchoolClass) = a.id == b.id
            override fun areContentsTheSame(a: SchoolClass, b: SchoolClass) = a == b
        }
    }
}
