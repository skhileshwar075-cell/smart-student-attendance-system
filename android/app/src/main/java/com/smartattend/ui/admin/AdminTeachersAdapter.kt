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
import com.smartattend.domain.model.Teacher

class AdminTeachersAdapter(
    private val onEdit: (Teacher) -> Unit,
    private val onDelete: (Teacher) -> Unit
) : ListAdapter<Teacher, AdminTeachersAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvInitial: TextView = view.findViewById(R.id.tvInitial)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvEmail: TextView = view.findViewById(R.id.tvEmail)
        val tvDepartment: TextView = view.findViewById(R.id.tvDepartment)
        val btnEdit: ImageButton = view.findViewById(R.id.btnEdit)
        val btnDelete: ImageButton = view.findViewById(R.id.btnDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_teacher, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvInitial.text = item.name.firstOrNull()?.uppercase() ?: "?"
        holder.tvName.text = item.name
        holder.tvEmail.text = item.email
        holder.tvDepartment.text = item.department ?: "—"
        holder.btnEdit.setOnClickListener { onEdit(item) }
        holder.btnDelete.setOnClickListener { onDelete(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Teacher>() {
            override fun areItemsTheSame(a: Teacher, b: Teacher) = a.id == b.id
            override fun areContentsTheSame(a: Teacher, b: Teacher) = a == b
        }
    }
}
